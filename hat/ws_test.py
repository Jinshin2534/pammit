import asyncio
from aiohttp import ClientSession

async def main():
    async with ClientSession() as session:
        async with session.ws_connect(
            "http://127.0.0.1:5000/events"
        ) as ws:
            print("WebSocket connected")

            await ws.send_json({"cmd": "ping"})
            print("ping sent")

            msg = await ws.receive(timeout=5)
            print("received:", msg.data)

asyncio.run(main())

