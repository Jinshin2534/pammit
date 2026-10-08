import asyncio
from pathlib import Path
from aiohttp import ClientSession, WSMsgType

async def heartbeat(ws):
    while True:
        await ws.send_json({"cmd": "ping"})
        await asyncio.sleep(2)

async def main():
    async with ClientSession() as session:
        async with session.ws_connect(
            "http://127.0.0.1:5000/events"
        ) as ws:

            print("WebSocket connected")
            print("「お願い」と話してください")

            ping_task = asyncio.create_task(heartbeat(ws))

            try:
                async for msg in ws:

                    if msg.type == WSMsgType.TEXT:
                        print("TEXT:", msg.data)

                    elif msg.type == WSMsgType.BINARY:

                        if msg.data[:1] == b"J":
                            jpeg = msg.data[1:]

                            Path("/tmp/judge.jpg").write_bytes(jpeg)

                            print(
                                "JPEG received:",
                                len(jpeg),
                                "bytes"
                            )
                            print("saved: /tmp/judge.jpg")

                        else:
                            print(
                                "BINARY:",
                                len(msg.data),
                                "bytes"
                            )

            finally:
                ping_task.cancel()

asyncio.run(main())
