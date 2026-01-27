def moderate_shop_name(shop_name: str) -> dict:
    """
    Проверяет название магазина на допустимость.
    Возвращает словарь с результатом модерации.
    """
    # Базовая проверка на запрещенные слова и длину
    forbidden_words = ['admin', 'test', 'spam', 'fuck', 'shit']
    shop_name_lower = shop_name.lower().strip()

    # Проверка длины
    if len(shop_name_lower) < 3:
        return {"approved": False, "reason": "Название слишком короткое"}

    if len(shop_name_lower) > 100:
        return {"approved": False, "reason": "Название слишком длинное"}

    # Проверка на запрещенные слова
    for word in forbidden_words:
        if word in shop_name_lower:
            return {"approved": False, "reason": f"Запрещенное слово: {word}"}

    return {"approved": True}


def track_device(user, request):
    """
    Отслеживает устройство пользователя.
    Сохраняет информацию об IP, User-Agent и времени последнего входа.
    """
    try:
        # Получаем IP адрес
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')

        # Получаем User-Agent
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        # Логируем информацию (в будущем можно сохранять в БД)
        print(f"[Device Tracking] User {user.id} logged in from IP: {ip}, User-Agent: {user_agent}")

        # Можно добавить сохранение в модель DeviceLog если нужно
        # DeviceLog.objects.create(user=user, ip=ip, user_agent=user_agent)

    except Exception as e:
        # Не прерываем процесс авторизации при ошибке отслеживания
        print(f"[Device Tracking] Error: {str(e)}")
