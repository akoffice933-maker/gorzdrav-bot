import asyncio
import datetime
import io
from cachetools import TTLCache

from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from PIL import Image
import easyocr

from config import BOT_TOKEN, MAX_FILE_SIZE_MB, OCR_LANGUAGES, CACHE_TTL
from gorzdrav_api import (
    get_districts, get_lpus_by_district, get_specialties,
    get_doctors, get_free_appointments
)
from src.utils.http_client import close_session as close_http_session
from ai_analyzer import suggest_tests, analyze_lab_result, answer_question
from src.models.database import SessionLocal, User, AnalysisHistory, init_db
from src.utils.logger import logger
from src.utils.validators import validate_medical_input, validate_file_size, sanitize_string
from src.utils.ratelimit import rate_limiter
from src.utils.db_async import run_db_operation

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# Инициализация OCR (однажды при старте)
reader = easyocr.Reader(OCR_LANGUAGES, gpu=False)

# TTL-кэш для API (автоочистка по истечении времени)
api_cache: TTLCache = TTLCache(maxsize=1000, ttl=CACHE_TTL)


def get_cached(key: str):
    return api_cache.get(key)


def set_cache(key: str, data):
    api_cache[key] = data


# Состояния
class MedStates(StatesGroup):
    waiting_symptoms = State()
    waiting_district = State()
    waiting_lpu = State()
    waiting_specialty = State()
    waiting_doctor = State()
    waiting_appointment = State()
    waiting_question = State()
    waiting_lab_result = State()


# ---------- OCR В ОТДЕЛЬНОМ ПОТОКЕ ----------
async def ocr_to_text(image_bytes: bytes) -> str:
    """Запускает OCR в отдельном потоке, чтобы не блокировать event loop"""
    try:
        image = Image.open(io.BytesIO(image_bytes))
        result = await asyncio.to_thread(
            reader.readtext, image, detail=0, paragraph=True
        )
        return " ".join(result).strip()
    except Exception as e:
        logger.error(f"OCR error: {e}", exc_info=True)
        return ""


# ---------- СТАРТ ----------
@dp.message(Command("start"))
async def cmd_start(message: Message, state: FSMContext):
    """Главное меню"""
    try:
        await state.clear()

        # Rate limit
        if not rate_limiter.is_allowed(f"user_{message.from_user.id}", limit=10, window_seconds=60):
            await message.answer("Слишком много команд. Подождите минуту.")
            return

        # Регистрируем пользователя (в отдельном потоке)
        def _register_user():
            session = SessionLocal()
            try:
                existing_user = session.query(User).filter_by(tg_id=message.from_user.id).first()
                if not existing_user:
                    session.add(User(tg_id=message.from_user.id))
                    session.commit()
                    logger.info(f"New user registered: {message.from_user.id}")
            except Exception as e:
                logger.error(f"Error saving user: {e}", exc_info=True)
                session.rollback()
            finally:
                session.close()

        await asyncio.to_thread(_register_user)

        # Главное меню
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🩺 Записаться к врачу", callback_data="book")],
            [InlineKeyboardButton(text="🔬 Расшифровать анализ", callback_data="analyze")],
            [InlineKeyboardButton(text="💊 Спросить у ИИ", callback_data="ask")],
            [InlineKeyboardButton(text="📋 Симптомы → анализы", callback_data="symptoms")],
            [InlineKeyboardButton(text="📅 Мои записи", callback_data="my_appointments")],
            [InlineKeyboardButton(text="📖 Помощь с VPN", callback_data="help_vpn")]
        ])
        await message.answer(
            "👋 Привет! Я медицинский помощник с ИИ.\n\n"
            "⚠️ **Важно**: Я не заменяю врача. Все решения принимайте с доктором.\n\n"
            "Выберите действие:",
            reply_markup=keyboard
        )

    except Exception as e:
        logger.error(f"Error in start command: {e}", exc_info=True)
        await message.answer("Ошибка. Попробуйте /start снова.")


# ---------- ОБРАБОТКА КНОПОК ----------
@dp.callback_query(F.data == "symptoms")
async def symptoms_handler(call: CallbackQuery, state: FSMContext):
    try:
        if not rate_limiter.is_allowed(f"user_{call.from_user.id}", limit=5, window_seconds=60):
            await call.message.answer("Слишком много запросов. Подождите минуту.")
            await call.answer()
            return

        await call.message.answer("Опишите ваши симптомы (например: «болит горло, температура 38, кашель»):")
        await state.set_state(MedStates.waiting_symptoms)
        await call.answer()
    except Exception as e:
        logger.error(f"Error in symptoms_handler: {e}", exc_info=True)
        await call.message.answer("Произошла ошибка. Попробуйте снова.")


@dp.callback_query(F.data == "analyze")
async def analyze_handler(call: CallbackQuery, state: FSMContext):
    try:
        if not rate_limiter.is_allowed(f"user_{call.from_user.id}", limit=5, window_seconds=60):
            await call.message.answer("Слишком много запросов. Подождите минуту.")
            await call.answer()
            return

        await call.message.answer("📸 Отправьте **фото** результата анализа (поддерживаются фото с текстом):")
        await state.set_state(MedStates.waiting_lab_result)
        await call.answer()
    except Exception as e:
        logger.error(f"Error in analyze_handler: {e}", exc_info=True)
        await call.message.answer("Произошла ошибка. Попробуйте снова.")


@dp.callback_query(F.data == "ask")
async def ask_handler(call: CallbackQuery, state: FSMContext):
    try:
        if not rate_limiter.is_allowed(f"user_{call.from_user.id}", limit=5, window_seconds=60):
            await call.message.answer("Слишком много запросов. Подождите минуту.")
            await call.answer()
            return

        await call.message.answer("Задайте любой вопрос о здоровье, анализах, симптомах:")
        await state.set_state(MedStates.waiting_question)
        await call.answer()
    except Exception as e:
        logger.error(f"Error in ask_handler: {e}", exc_info=True)
        await call.message.answer("Произошла ошибка. Попробуйте снова.")


@dp.callback_query(F.data == "book")
async def book_handler(call: CallbackQuery, state: FSMContext):
    """Начало записи к врачу — без ЕСИА, запись через сайт вручную"""
    try:
        await _start_booking_flow(call.message, state)
        await call.answer()
    except Exception as e:
        logger.error(f"Error in book_handler: {e}", exc_info=True)
        await call.message.answer("Произошла ошибка. Попробуйте снова.")


async def _start_booking_flow(target, state: FSMContext):
    """Универсальное начало записи — принимает Message или CallbackQuery.message"""
    districts = await get_districts()
    if not districts:
        await target.answer("Не удалось загрузить районы. Попробуйте позже.")
        return
    await state.update_data(districts=districts)
    buttons = [[InlineKeyboardButton(text=d["name"], callback_data=f"dist_{d['id']}")] for d in districts[:15]]
    buttons.append([InlineKeyboardButton(text="❌ Отмена", callback_data="cancel")])
    await target.answer("🏥 Выберите район:", reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons))
    await state.set_state(MedStates.waiting_district)


@dp.callback_query(F.data == "my_appointments")
async def my_appointments(call: CallbackQuery):
    try:
        def _get_user_appointment():
            session = SessionLocal()
            try:
                return session.query(User).filter_by(tg_id=call.from_user.id).first()
            finally:
                session.close()

        user = await asyncio.to_thread(_get_user_appointment)

        if user and user.appointment_time and user.doctor_name:
            await call.message.answer(
                f"📅 Ваша запись:\n"
                f"👨‍⚕️ Врач: {sanitize_string(user.doctor_name, 100)}\n"
                f"🏥 Поликлиника: {sanitize_string(user.lpu_name, 100)}\n"
                f"⏰ Время: {user.appointment_time.strftime('%d.%m.%Y %H:%M')}\n\n"
                f"❓ Хотите отменить? Напишите /cancel_booking"
            )
        else:
            await call.message.answer("📭 У вас нет активных записей.")
        await call.answer()
    except Exception as e:
        logger.error(f"Error in my_appointments: {e}", exc_info=True)


# ---------- ЗАПИСЬ К ВРАЧУ (с кэшем) ----------
@dp.callback_query(MedStates.waiting_district, F.data.startswith("dist_"))
async def district_chosen(call: CallbackQuery, state: FSMContext):
    try:
        district_id = int(call.data.split("_")[1])
        cache_key = f"lpus_{district_id}"
        lpus = get_cached(cache_key)
        if not lpus:
            lpus = await get_lpus_by_district(district_id)
            if lpus:
                set_cache(cache_key, lpus)

        if not lpus:
            await call.message.answer("Нет поликлиник в этом районе.")
            return

        await state.update_data(lpus=lpus)

        # В callback_data только ID — имена храним в state
        buttons = [[InlineKeyboardButton(text=l["name"][:50], callback_data=f"lpu_{l['id']}")] for l in lpus[:15]]
        buttons.append([InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_districts")])
        await call.message.edit_text("🏥 Выберите поликлинику:", reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons))
        await state.set_state(MedStates.waiting_lpu)
        await call.answer()
    except Exception as e:
        logger.error(f"Error in district_chosen: {e}", exc_info=True)
        await call.message.answer("Произошла ошибка. Попробуйте снова.")


@dp.callback_query(MedStates.waiting_lpu, F.data.startswith("lpu_"))
async def lpu_chosen(call: CallbackQuery, state: FSMContext):
    try:
        lpu_id = int(call.data.split("_")[1])

        # Ищем имя поликлиники в сохранённом списке
        data = await state.get_data()
        lpus = data.get("lpus", [])
        lpu_name = next((l.get("name", "") for l in lpus if l.get("id") == lpu_id), "")

        specialties = await get_specialties(lpu_id)

        if not specialties:
            await call.message.answer("Нет доступных специальностей в этой поликлинике.")
            return

        await state.update_data(
            lpu_id=lpu_id,
            lpu_name=lpu_name
        )
        buttons = [[InlineKeyboardButton(text=s["name"][:50], callback_data=f"spec_{s['id']}")] for s in specialties[:15]]
        buttons.append([InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_lpus")])
        await call.message.edit_text("👨‍⚕️ Выберите специальность:", reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons))
        await state.set_state(MedStates.waiting_specialty)
        await call.answer()
    except Exception as e:
        logger.error(f"Error in lpu_chosen: {e}", exc_info=True)
        await call.message.answer("Произошла ошибка. Попробуйте снова.")


@dp.callback_query(MedStates.waiting_specialty, F.data.startswith("spec_"))
async def specialty_chosen(call: CallbackQuery, state: FSMContext):
    try:
        data = await state.get_data()
        lpu_id = data.get("lpu_id")
        specialty_id = int(call.data.split("_")[1])

        doctors = await get_doctors(lpu_id, specialty_id)

        if not doctors:
            await call.message.answer("Нет доступных врачей по данной специальности.")
            return

        # Сохраняем список врачей в state для поиска имён, в callback_data только ID
        await state.update_data(specialty_id=specialty_id, doctors=doctors)
        buttons = [[InlineKeyboardButton(text=d["name"][:50], callback_data=f"doc_{d['id']}")] for d in doctors[:15]]
        buttons.append([InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_specialties")])
        await call.message.edit_text("👤 Выберите врача:", reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons))
        await state.set_state(MedStates.waiting_doctor)
        await call.answer()
    except Exception as e:
        logger.error(f"Error in specialty_chosen: {e}", exc_info=True)
        await call.message.answer("Произошла ошибка. Попробуйте снова.")


@dp.callback_query(MedStates.waiting_doctor, F.data.startswith("doc_"))
async def doctor_chosen(call: CallbackQuery, state: FSMContext):
    try:
        data = await state.get_data()
        lpu_id = data.get("lpu_id")
        doctor_id = int(call.data.split("_")[1])

        # Ищем имя врача в сохранённом списке
        doctors = data.get("doctors", [])
        doctor_name = next((d.get("name", "") for d in doctors if d.get("id") == doctor_id), "")

        appointments = await get_free_appointments(lpu_id, doctor_id)

        if not appointments:
            await call.message.answer("Нет свободных записей у этого врача.")
            return

        # Сохраняем данные и время для дальнейшего использования
        await state.update_data(
            doctor_id=doctor_id,
            doctor_name=doctor_name,
            appointments=appointments,
        )

        # В callback_data только ID + короткое время (до 64 байт)
        buttons = []
        for a in appointments[:10]:
            time_str = a.get("time", "")
            # Кодируем время: убираем разделители для экономии места
            short_time = time_str.replace("-", "").replace(":", "").replace("T", "T")[:16]
            callback = f"appt_{a['id']}_{short_time}"
            if len(callback.encode()) > 64:
                callback = f"appt_{a['id']}"
            buttons.append([InlineKeyboardButton(text=time_str, callback_data=callback)])

        buttons.append([InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_doctors")])
        await call.message.edit_text("⏰ Выберите время приёма:", reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons))
        await state.set_state(MedStates.waiting_appointment)
        await call.answer()
    except Exception as e:
        logger.error(f"Error in doctor_chosen: {e}", exc_info=True)
        await call.message.answer("Произошла ошибка. Попробуйте снова.")


@dp.callback_query(MedStates.waiting_appointment, F.data.startswith("appt_"))
async def appointment_chosen(call: CallbackQuery, state: FSMContext):
    try:
        data = await state.get_data()
        parts = call.data.split("_", 2)  # appt_{id} или appt_{id}_{time}
        appointment_id = int(parts[1])

        # Извлекаем время из callback_data если есть
        appointment_time_str = parts[2] if len(parts) > 2 else None

        doctor_id = data.get("doctor_id")
        doctor_name = data.get("doctor_name", "") or "Врач (ID: {})".format(doctor_id)
        lpu_id = data.get("lpu_id")
        lpu_name = data.get("lpu_name", "") or "Поликлиника (ID: {})".format(lpu_id)

        # Определяем время записи
        appointment_time = None
        if appointment_time_str:
            try:
                # Пробуем разные форматы
                for fmt in ("%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M", "%Y%m%dT%H:%M", "%Y%m%d %H:%M"):
                    try:
                        appointment_time = datetime.datetime.strptime(appointment_time_str, fmt)
                        break
                    except ValueError:
                        continue
            except Exception:
                pass

        if not appointment_time:
            appointment_time = datetime.datetime.utcnow() + datetime.timedelta(days=3)

        # Сохраняем запись в БД (в отдельном потоке)
        def _save_appointment():
            session = SessionLocal()
            try:
                user = session.query(User).filter_by(tg_id=call.from_user.id).first()
                if user:
                    user.doctor_id = doctor_id
                    user.doctor_name = sanitize_string(doctor_name, 100)
                    user.lpu_id = lpu_id
                    user.lpu_name = sanitize_string(lpu_name, 100)
                    user.appointment_time = appointment_time
                    user.reminder_sent = False
                    session.commit()
            finally:
                session.close()

        await asyncio.to_thread(_save_appointment)

        # Формируем ссылки и кнопки
        gorzdrav_url = "https://gorzdrav.spb.ru/"

        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🌐 Открыть gorzdrav.spb.ru", url=gorzdrav_url)],
            [InlineKeyboardButton(text="✅ Я записался через сайт", callback_data="confirmed_booking")],
            [InlineKeyboardButton(text="📖 Помощь с VPN", callback_data="help_vpn")]
        ])

        formatted_time = appointment_time.strftime("%d.%m.%Y в %H:%M")

        await call.message.answer(
            f"📋 Вы выбрали:\n\n"
            f"🏥 Поликлиника: {sanitize_string(lpu_name, 100)}\n"
            f"👨‍⚕️ Врач: {sanitize_string(doctor_name, 100)}\n"
            f"⏰ Желаемое время: {formatted_time}\n\n"
            f"⚠️ Для завершения записи:\n\n"
            f"1️⃣ <b>Выключите VPN</b> (Горздрав не работает через VPN)\n"
            f"2️⃣ Откройте сайт по кнопке ниже\n"
            f"3️⃣ Авторизуйтесь через Госуслуги\n"
            f"4️⃣ Запишитесь на то же время: <b>{formatted_time}</b>\n"
            f"5️⃣ Нажмите «Я записался через сайт»\n\n"
            f"💡 Если Telegram не работает без VPN — используйте\n"
            f"Split-tunneling: оставьте VPN только для Telegram,\n"
            f"а для Горздрава — прямое подключение.\n\n"
            f"🔔 Я напомню вам за 3 часа до визита.",
            reply_markup=keyboard,
            parse_mode="HTML"
        )
        await state.clear()
        await call.answer()
    except Exception as e:
        logger.error(f"Error in appointment_chosen: {e}", exc_info=True)
        await call.message.answer("Произошла ошибка при записи. Попробуйте снова.")


# ---------- ОБРАБОТКА ТЕКСТА (симптомы, вопрос) ----------
@dp.message(MedStates.waiting_symptoms)
async def handle_symptoms(message: Message, state: FSMContext):
    try:
        if not rate_limiter.is_allowed(f"user_{message.from_user.id}", limit=3, window_seconds=60):
            await message.answer("Слишком много запросов. Подождите минуту.")
            return

        is_valid, result = validate_medical_input(message.text)
        if not is_valid:
            await message.answer(f"Ошибка: {result}")
            return

        await message.answer("🔬 Подбираю рекомендуемые анализы...")
        analysis = await suggest_tests(result)
        await message.answer(analysis)
        await state.clear()
    except Exception as e:
        logger.error(f"Error in handle_symptoms: {e}", exc_info=True)
        await message.answer("Произошла ошибка. Попробуйте снова.")


@dp.message(MedStates.waiting_question)
async def handle_question(message: Message, state: FSMContext):
    try:
        if not rate_limiter.is_allowed(f"user_{message.from_user.id}", limit=3, window_seconds=60):
            await message.answer("Слишком много запросов. Подождите минуту.")
            return

        is_valid, result = validate_medical_input(message.text)
        if not is_valid:
            await message.answer(f"Ошибка: {result}")
            return

        await message.answer("🤖 Думаю над вашим вопросом...")
        answer = await answer_question(result)
        await message.answer(answer)
        await state.clear()
    except Exception as e:
        logger.error(f"Error in handle_question: {e}", exc_info=True)
        await message.answer("Произошла ошибка. Попробуйте снова.")


# ---------- OCR ДЛЯ АНАЛИЗОВ (В ОТДЕЛЬНОМ ПОТОКЕ) ----------
@dp.message(MedStates.waiting_lab_result, F.photo)
async def handle_photo(message: Message, state: FSMContext):
    processing_msg = None
    try:
        if not rate_limiter.is_allowed(f"user_{message.from_user.id}", limit=3, window_seconds=60):
            await message.answer("Слишком много запросов. Подождите минуту.")
            return

        processing_msg = await message.answer("📸 Распознаю текст с фото... Это может занять 5-10 секунд.")

        photo = message.photo[-1]

        # Валидируем размер файла
        is_valid_size, size_error = validate_file_size(photo.file_size or 0, MAX_FILE_SIZE_MB)
        if not is_valid_size:
            await processing_msg.edit_text(size_error)
            return

        # Скачиваем фото
        file = await bot.get_file(photo.file_id)
        file_bytes = await bot.download_file(file.file_path)

        # OCR в отдельном потоке
        ocr_text = await ocr_to_text(file_bytes.read())

        if len(ocr_text) < 20:
            await processing_msg.edit_text(
                "Не удалось распознать текст. Попробуйте:\n"
                "• Сделать фото чётче\n"
                "• Отправить текст вручную"
            )
            return

        await processing_msg.edit_text("✅ Распознано.\n\n🔬 Анализирую...")

        # Анализ через ИИ
        analysis = await analyze_lab_result(ocr_text)
        await message.answer(analysis)

        # Сохраняем в историю (в отдельном потоке)
        def _save_ocr_history():
            session = SessionLocal()
            try:
                session.add(AnalysisHistory(
                    tg_id=message.from_user.id,
                    analysis_type='ocr',
                    raw_text=ocr_text,
                    ai_analysis=analysis
                ))
                session.commit()
            finally:
                session.close()

        await asyncio.to_thread(_save_ocr_history)

    except Exception as e:
        logger.error(f"Photo handler error: {e}", exc_info=True)
        if processing_msg:
            await processing_msg.edit_text(f"Ошибка распознавания. Попробуйте отправить текст вручную.")
    finally:
        await state.clear()


@dp.message(MedStates.waiting_lab_result, F.text)
async def handle_lab_text(message: Message, state: FSMContext):
    try:
        if not rate_limiter.is_allowed(f"user_{message.from_user.id}", limit=3, window_seconds=60):
            await message.answer("Слишком много запросов. Подождите минуту.")
            return

        is_valid, result = validate_medical_input(message.text, max_length=4000)
        if not is_valid:
            await message.answer(f"Ошибка: {result}")
            return

        await message.answer("🔬 Анализирую результаты...")
        analysis = await analyze_lab_result(result)
        await message.answer(analysis)

        # Сохраняем в историю (в отдельном потоке)
        def _save_text_history():
            session = SessionLocal()
            try:
                session.add(AnalysisHistory(
                    tg_id=message.from_user.id,
                    analysis_type='text',
                    raw_text=result,
                    ai_analysis=analysis
                ))
                session.commit()
            finally:
                session.close()

        await asyncio.to_thread(_save_text_history)
        await state.clear()
    except Exception as e:
        logger.error(f"Lab text handler error: {e}", exc_info=True)
        await message.answer("Произошла ошибка. Попробуйте снова.")


# ---------- ОТМЕНА ЗАПИСИ ----------
@dp.message(Command("cancel_booking"))
async def cancel_booking(message: Message, state: FSMContext):
    try:
        def _cancel_booking():
            session = SessionLocal()
            try:
                user = session.query(User).filter_by(tg_id=message.from_user.id).first()
                if user:
                    user.appointment_time = None
                    user.doctor_id = None
                    user.doctor_name = None
                    user.lpu_id = None
                    user.lpu_name = None
                    user.district_id = None
                    user.reminder_sent = False
                    session.commit()
                    return True
                return False
            finally:
                session.close()

        had_appointment = await asyncio.to_thread(_cancel_booking)
        if had_appointment:
            await message.answer("🗑️ Ваша запись отменена.")
        else:
            await message.answer("📭 У вас нет активных записей.")
    except Exception as e:
        logger.error(f"Error in cancel_booking: {e}", exc_info=True)
        await message.answer("Произошла ошибка. Попробуйте снова.")


# ---------- ОТМЕНА ----------
@dp.callback_query(F.data == "cancel")
async def cancel_handler(call: CallbackQuery, state: FSMContext):
    try:
        await state.clear()
        await call.message.answer("❌ Операция отменена. Нажмите /start для выбора действия.")
        await call.answer()
    except Exception as e:
        logger.error(f"Error in cancel_handler: {e}", exc_info=True)


# ---------- ПОДТВЕРЖДЕНИЕ ЗАПИСИ ----------
@dp.callback_query(F.data == "confirmed_booking")
async def confirmed_booking(call: CallbackQuery):
    """Пользователь подтвердил, что записался через сайт"""
    try:
        await call.message.edit_text(
            f"✅ Отлично! Запись подтверждена.\n\n"
            f"📅 Я пришлю напоминание за 3 часа до визита.\n"
            f"Не забудьте:\n"
            f"• Паспорт\n"
            f"• Полис ОМС\n"
            f"• СНИЛС"
        )
        await call.answer()
    except Exception as e:
        logger.error(f"Error in confirmed_booking: {e}", exc_info=True)


# ---------- ПОМОЩЬ С VPN ----------
@dp.callback_query(F.data == "help_vpn")
async def help_vpn_handler(call: CallbackQuery):
    try:
        await call.message.answer(
            "🔧 <b>Почему Горздрав не работает через VPN:</b>\n\n"
            "Государственные медсервисы РФ определяют иностранные IP и "
            "блокируют доступ. Telegram при этом часто работает только через VPN.\n\n"
            "✅ <b>Решение 1 — Выключить VPN</b>\n"
            "1. Полностью отключите VPN\n"
            "2. Откройте браузер → gorzdrav.spb.ru\n"
            "3. Запишитесь через Госуслуги\n\n"
            "✅ <b>Решение 2 — Split-tunneling</b>\n"
            "Настройте VPN так, чтобы Telegram шёл через VPN,\n"
            "а весь остальной трафик — напрямую.\n"
            "Это поддерживают: Amnezia VPN, Outline, WireGuard.\n\n"
            "✅ <b>Решение 3 — Российский VPN</b>\n"
            "Используйте VPN-сервер в России (Amnezia, свой сервер).\n"
            "Горздрав не блокирует российские IP.\n\n"
            "✅ <b>Решение 4 — Мобильный интернет</b>\n"
            "Отключите Wi-Fi → используйте мобильный интернет.\n"
            "Откройте gorzdrav.spb.ru в браузере.\n\n"
            "📞 <b>Альтернативы:</b>\n"
            "• Телефон 122 (единая запись)\n"
            "• Приложение «Госуслуги»\n"
            "• Лично в регистратуре поликлиники",
            parse_mode="HTML"
        )
        await call.answer()
    except Exception as e:
        logger.error(f"Error in help_vpn_handler: {e}", exc_info=True)


@dp.message(Command("help_vpn"))
async def cmd_help_vpn(message: Message):
    """Команда помощи с VPN"""
    try:
        if not rate_limiter.is_allowed(f"user_{message.from_user.id}", limit=5, window_seconds=60):
            await message.answer("Слишком много запросов. Подождите минуту.")
            return

        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🌐 Открыть gorzdrav.spb.ru", url="https://gorzdrav.spb.ru/")],
            [InlineKeyboardButton(text="📋 Мои записи", callback_data="my_appointments")]
        ])
        await message.answer(
            "🔧 <b>Почему Горздрав не работает через VPN:</b>\n\n"
            "Государственные медсервисы РФ определяют иностранные IP и "
            "блокируют доступ. Telegram при этом часто работает только через VPN.\n\n"
            "✅ <b>Решение 1 — Выключить VPN</b>\n"
            "1. Полностью отключите VPN\n"
            "2. Откройте браузер → gorzdrav.spb.ru\n"
            "3. Запишитесь через Госуслуги\n\n"
            "✅ <b>Решение 2 — Split-tunneling</b>\n"
            "Настройте VPN так, чтобы Telegram шёл через VPN,\n"
            "а весь остальной трафик — напрямую.\n"
            "Это поддерживают: Amnezia VPN, Outline, WireGuard.\n\n"
            "✅ <b>Решение 3 — Российский VPN</b>\n"
            "Используйте VPN-сервер в России.\n"
            "Горздрав не блокирует российские IP.\n\n"
            "✅ <b>Решение 4 — Мобильный интернет</b>\n"
            "Отключите Wi-Fi → используйте мобильный интернет.\n"
            "Откройте gorzdrav.spb.ru в браузере.\n\n"
            "📞 <b>Альтернативы:</b>\n"
            "• Телефон 122 (единая запись)\n"
            "• Приложение «Госуслуги»\n"
            "• Лично в регистратуре поликлиники",
            reply_markup=keyboard,
            parse_mode="HTML"
        )
    except Exception as e:
        logger.error(f"Error in cmd_help_vpn: {e}", exc_info=True)
        await message.answer("Произошла ошибка. Попробуйте снова.")


# ---------- НАПОМИНАНИЯ (фоновый таск с обработкой ошибок) ----------
async def reminder_checker():
    """Проверяет каждые 30 минут и отправляет напоминания"""
    while True:
        try:
            now = datetime.datetime.utcnow()

            # Получаем пользователей для напоминаний (в отдельном потоке)
            def _get_reminder_users():
                session = SessionLocal()
                try:
                    users = session.query(User).filter(
                        User.appointment_time > now,
                        User.appointment_time < now + datetime.timedelta(hours=3),
                        User.reminder_sent == False
                    ).all()
                    # Сериализуем данные, чтобы не держать сессию открытой
                    return [(u.tg_id, u.doctor_name, u.lpu_name, u.appointment_time, u.id) for u in users]
                finally:
                    session.close()

            reminder_users = await asyncio.to_thread(_get_reminder_users)

            for tg_id, doctor_name, lpu_name, appt_time, user_id in reminder_users:
                try:
                    await bot.send_message(
                        tg_id,
                        f"⏰ **Напоминание о визите!**\n\n"
                        f"👨‍⚕️ {sanitize_string(doctor_name, 100)}\n"
                        f"🏥 {sanitize_string(lpu_name, 100)}\n"
                        f"⏰ {appt_time.strftime('%d.%m.%Y в %H:%M')}\n\n"
                        f"Не забудьте взять паспорт и полис ОМС!",
                        parse_mode="Markdown"
                    )

                    # Отмечаем как отправленное (в отдельном потоке)
                    def _mark_reminder_sent(uid):
                        session = SessionLocal()
                        try:
                            u = session.query(User).filter_by(id=uid).first()
                            if u:
                                u.reminder_sent = True
                                session.commit()
                        finally:
                            session.close()

                    await asyncio.to_thread(_mark_reminder_sent, user_id)
                    logger.info(f"Reminder sent to user {tg_id}")

                except Exception as e:
                    logger.error(f"Failed to send reminder to {tg_id}: {e}")
                    continue

        except Exception as e:
            logger.error(f"Error in reminder_checker: {e}", exc_info=True)

        finally:
            await asyncio.sleep(1800)  # 30 минут


# ---------- ЗАПУСК ----------
async def main():
    """Точка входа"""
    reminder_task: asyncio.Task | None = None

    try:
        logger.info("🚀 Bot starting...")

        # Инициализация БД
        init_db()
        logger.info("Database initialized")

        # Запуск напоминаний
        reminder_task = asyncio.create_task(reminder_checker())

        # Запуск polling
        await dp.start_polling(
            bot,
            allowed_updates=dp.resolve_used_update_types(),
            skip_updates=False
        )

    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
    finally:
        logger.info("Bot stopped, closing sessions...")

        # Корректная остановка reminder_task
        if reminder_task and not reminder_task.done():
            reminder_task.cancel()
            try:
                await reminder_task
            except asyncio.CancelledError:
                logger.info("Reminder task cancelled")

        await bot.session.close()
        await close_http_session()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot interrupted by user")
