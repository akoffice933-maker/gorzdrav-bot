import asyncio
import datetime
import secrets
import io
from urllib.parse import urlencode
from cachetools import TTLCache

from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from PIL import Image
import easyocr

from config import BOT_TOKEN, ESIA_CLIENT_ID, ESIA_REDIRECT_URI, ESIA_PRIVATE_KEY_PATH, MAX_FILE_SIZE_MB, OCR_LANGUAGES, CACHE_TTL
from gorzdrav_api import (
    get_districts, get_lpus_by_district, get_specialties,
    get_doctors, get_free_appointments, close_session as close_api_session
)
from ai_analyzer import suggest_tests, analyze_lab_result, answer_question
from src.models.database import SessionLocal, User, AnalysisHistory, init_db
from src.utils.logger import logger
from src.utils.validators import validate_medical_input, validate_file_size, sanitize_string
from src.utils.ratelimit import rate_limiter

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
    waiting_esia_code = State()


# ---------- ЕСИА АВТОРИЗАЦИЯ ----------
class EsiaConnector:
    def __init__(self, client_id, redirect_uri, private_key_path):
        self.client_id = client_id
        self.redirect_uri = redirect_uri
        try:
            with open(private_key_path) as f:
                self.private_key = f.read()
        except FileNotFoundError:
            self.private_key = None

    def get_auth_url(self, state):
        """Генерирует URL для перехода пользователя на Госуслуги"""
        params = {
            'client_id': self.client_id,
            'response_type': 'code',
            'redirect_uri': self.redirect_uri,
            'scope': 'openid fullname birthdate snils',
            'state': state
        }
        auth_url = "https://esia.gosuslugi.ru/aas/oauth2/ac?" + urlencode(params)
        return auth_url

    def get_tokens(self, code):
        """Обменивает временный код на токены доступа (демо)"""
        # В реальном проекте здесь POST запрос с JWT подписью
        logger.warning("ESIA get_tokens called with demo implementation")
        return {'access_token': 'demo_token'}


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

        # Регистрируем пользователя
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

        # Главное меню
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🩺 Записаться к врачу", callback_data="book")],
            [InlineKeyboardButton(text="🔬 Расшифровать анализ", callback_data="analyze")],
            [InlineKeyboardButton(text="💊 Спросить у ИИ", callback_data="ask")],
            [InlineKeyboardButton(text="📋 Симптомы → анализы", callback_data="symptoms")],
            [InlineKeyboardButton(text="📅 Мои записи", callback_data="my_appointments")]
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
    try:
        session = SessionLocal()
        user = session.query(User).filter_by(tg_id=call.from_user.id).first()
        session.close()

        if not user or not user.esia_token:
            # Требуется авторизация через Госуслуги
            esia = EsiaConnector(ESIA_CLIENT_ID, ESIA_REDIRECT_URI, ESIA_PRIVATE_KEY_PATH)
            state_param = secrets.token_urlsafe(16)
            auth_url = esia.get_auth_url(state_param)

            await call.message.answer(
                "🔐 Требуется авторизация через Госуслуги.\n\n"
                f"[Нажмите для входа]({auth_url})\n\n"
                "После входа получите код и отправьте его боту.",
                parse_mode="Markdown"
            )
            await state.set_state(MedStates.waiting_esia_code)
            await call.answer()
            return

        # Если уже авторизован, продолжаем запись
        await start_booking_flow(call, state)
    except Exception as e:
        logger.error(f"Error in book_handler: {e}", exc_info=True)
        await call.message.answer("Произошла ошибка. Попробуйте снова.")


async def start_booking_flow(call: CallbackQuery, state: FSMContext):
    """Начало процесса записи к врачу (из callback)"""
    try:
        districts = await get_districts()
        if not districts:
            await call.message.answer("Не удалось загрузить районы. Попробуйте позже.")
            return
        await state.update_data(districts=districts)
        buttons = [[InlineKeyboardButton(text=d["name"], callback_data=f"dist_{d['id']}")] for d in districts[:15]]
        buttons.append([InlineKeyboardButton(text="❌ Отмена", callback_data="cancel")])
        await call.message.edit_text("🏥 Выберите район:", reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons))
        await state.set_state(MedStates.waiting_district)
        await call.answer()
    except Exception as e:
        logger.error(f"Error in start_booking_flow: {e}", exc_info=True)
        await call.message.answer("Произошла ошибка. Попробуйте снова.")


async def start_booking_flow_for_message(message: Message, state: FSMContext):
    """Начало процесса записи к врачу (из обычного сообщения)"""
    try:
        districts = await get_districts()
        if not districts:
            await message.answer("Не удалось загрузить районы. Попробуйте позже.")
            return
        await state.update_data(districts=districts)
        buttons = [[InlineKeyboardButton(text=d["name"], callback_data=f"dist_{d['id']}")] for d in districts[:15]]
        buttons.append([InlineKeyboardButton(text="❌ Отмена", callback_data="cancel")])
        await message.answer("🏥 Выберите район:", reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons))
        await state.set_state(MedStates.waiting_district)
    except Exception as e:
        logger.error(f"Error in start_booking_flow_for_message: {e}", exc_info=True)
        await message.answer("Произошла ошибка. Попробуйте снова.")


@dp.callback_query(F.data == "my_appointments")
async def my_appointments(call: CallbackQuery):
    try:
        session = SessionLocal()
        user = session.query(User).filter_by(tg_id=call.from_user.id).first()
        session.close()

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


@dp.message(MedStates.waiting_esia_code)
async def handle_esia_code(message: Message, state: FSMContext):
    """Обработка кода авторизации ЕСИА"""
    try:
        code = message.text.strip()
        esia = EsiaConnector(ESIA_CLIENT_ID, ESIA_REDIRECT_URI, ESIA_PRIVATE_KEY_PATH)

        # В реальном проекте здесь обмен кода на токен
        tokens = esia.get_tokens(code)

        session = SessionLocal()
        user = session.query(User).filter_by(tg_id=message.from_user.id).first()
        if user:
            user.esia_token = tokens['access_token']
            session.commit()
        session.close()

        await message.answer("✅ Авторизация успешна! Теперь вы можете записаться к врачу.")
        await state.clear()

        # Автоматически начинаем запись
        await start_booking_flow_for_message(message, state)
    except Exception as e:
        logger.error(f"Error in handle_esia_code: {e}", exc_info=True)
        await message.answer("Произошла ошибка авторизации. Попробуйте снова.")


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
        specialties = await get_specialties(lpu_id)

        if not specialties:
            await call.message.answer("Нет доступных специальностей в этой поликлинике.")
            return

        await state.update_data(lpu_id=lpu_id)
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

        await state.update_data(specialty_id=specialty_id)
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

        appointments = await get_free_appointments(lpu_id, doctor_id)

        if not appointments:
            await call.message.answer("Нет свободных записей у этого врача.")
            return

        await state.update_data(doctor_id=doctor_id)
        buttons = [
            [InlineKeyboardButton(text=a["time"], callback_data=f"appt_{a['id']}")]
            for a in appointments[:10]
        ]
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
        appointment_id = int(call.data.split("_")[1])

        # Сохраняем запись в БД
        session = SessionLocal()
        user = session.query(User).filter_by(tg_id=call.from_user.id).first()
        if user:
            user.doctor_id = data.get("doctor_id")
            user.doctor_name = sanitize_string("Врач (ID: {})".format(data.get("doctor_id")), 100)
            user.lpu_id = data.get("lpu_id")
            user.lpu_name = sanitize_string("Поликлиника (ID: {})".format(data.get("lpu_id")), 100)
            user.appointment_time = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=3)  # демо-время
            user.reminder_sent = False
            session.commit()
        session.close()

        await call.message.answer(
            "✅ Вы успешно записаны!\n\n"
            "Напоминание придёт за 3 часа до приёма.\n"
            "Не забудьте паспорт и полис ОМС."
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

        # Сохраняем в историю
        session = SessionLocal()
        session.add(AnalysisHistory(
            tg_id=message.from_user.id,
            analysis_type='ocr',
            raw_text=ocr_text,
            ai_analysis=analysis
        ))
        session.commit()
        session.close()

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

        session = SessionLocal()
        session.add(AnalysisHistory(
            tg_id=message.from_user.id,
            analysis_type='text',
            raw_text=result,
            ai_analysis=analysis
        ))
        session.commit()
        session.close()
        await state.clear()
    except Exception as e:
        logger.error(f"Lab text handler error: {e}", exc_info=True)
        await message.answer("Произошла ошибка. Попробуйте снова.")


# ---------- ОТМЕНА ЗАПИСИ ----------
@dp.message(Command("cancel_booking"))
async def cancel_booking(message: Message, state: FSMContext):
    try:
        session = SessionLocal()
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
            await message.answer("🗑️ Ваша запись отменена.")
        else:
            await message.answer("📭 У вас нет активных записей.")
        session.close()
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


# ---------- НАПОМИНАНИЯ (фоновый таск с обработкой ошибок) ----------
async def reminder_checker():
    """Проверяет каждые 30 минут и отправляет напоминания"""
    while True:
        try:
            now = datetime.datetime.now(datetime.timezone.utc)
            session = SessionLocal()

            try:
                users_for_reminder = session.query(User).filter(
                    User.appointment_time > now,
                    User.appointment_time < now + datetime.timedelta(hours=3),
                    User.reminder_sent == False
                ).all()

                for user in users_for_reminder:
                    try:
                        await bot.send_message(
                            user.tg_id,
                            f"⏰ **Напоминание о визите!**\n\n"
                            f"👨‍⚕️ {sanitize_string(user.doctor_name, 100)}\n"
                            f"🏥 {sanitize_string(user.lpu_name, 100)}\n"
                            f"⏰ {user.appointment_time.strftime('%d.%m.%Y в %H:%M')}\n\n"
                            f"Не забудьте взять паспорт и полис ОМС!",
                            parse_mode="Markdown"
                        )
                        user.reminder_sent = True
                        session.commit()
                        logger.info(f"Reminder sent to user {user.tg_id}")

                    except Exception as e:
                        logger.error(f"Failed to send reminder to {user.tg_id}: {e}")
                        continue

            finally:
                session.close()

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
        await close_api_session()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot interrupted by user")
