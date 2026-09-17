from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse


class BodySizeLimitMiddleware:
    """在 multipart 解析、落盘前限制整个请求，流式请求也不能绕过。"""

    def __init__(self, app, max_file_size):
        self.app = app
        # 表单边界和文件名也会占一点空间。
        self.upload_limit = max_file_size + 64 * 1024

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        limit = self.upload_limit if scope["path"] == "/api/files/upload" else 128 * 1024
        headers = dict(scope.get("headers", []))
        try:
            length = int(headers.get(b"content-length", b"0"))
        except ValueError:
            length = 0
        if length > limit:
            await JSONResponse({"code": 413, "message": "请求体超过大小上限。"}, status_code=413)(scope, receive, send)
            return
        total = 0

        async def limited_receive():
            nonlocal total
            message = await receive()
            total += len(message.get("body", b""))
            if total > limit:
                raise HTTPException(413, "请求体超过大小上限。")
            return message

        await self.app(scope, limited_receive, send)
