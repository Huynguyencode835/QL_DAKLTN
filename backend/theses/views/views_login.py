import requests
from django.conf import settings
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

import logging
logger = logging.getLogger(__name__)

@ensure_csrf_cookie
def get_csrf_token(request):
    return JsonResponse({"detail": "CSRF cookie set"})


class CookieLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = {
            "grant_type": "password",
            "username": request.data.get("username"),
            "password": request.data.get("password"),
            "client_id": settings.OAUTH_CLIENT_ID,
            "client_secret": settings.OAUTH_CLIENT_SECRET,
        }

        url = request.build_absolute_uri("/o/token/")
        
        logger.error("Calling token URL: %s", url)

        token_response = requests.post(url, data=data, allow_redirects=False)

        if token_response.status_code != 200:
            logger.error("OAuth2 token error: %s %s", token_response.status_code, token_response.text)
            logger.error(
                "OAuth2 data sent: grant_type=%s, username=%s, has_password=%s, client_id=%s",
                data.get("grant_type"), data.get("username"), bool(data.get("password")), data.get("client_id")
            )
            return Response({"detail": f"Sai tài khoản hoặc mật khẩu: {token_response.text}"}, status=400)

        token_data = token_response.json()

        response = Response({
            "access_token": token_data["access_token"],
            "expires_in": token_data["expires_in"],
            "token_type": token_data["token_type"],
        })

        response.set_cookie(
            key="refresh_token",
            value=token_data["refresh_token"],
            httponly=True,
            secure=True,
            samesite="None",
            max_age=60 * 60 * 24 * 7,
            path="/api/token/refresh/",
        )
        return response


class CookieRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")
        if not refresh_token:
            return Response({"detail": "Không có refresh token"}, status=401)

        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": settings.OAUTH_CLIENT_ID,
            "client_secret": settings.OAUTH_CLIENT_SECRET,
        }
        token_response = requests.post(
            request.build_absolute_uri("/o/token/"), data=data
        )
        if token_response.status_code != 200:
            return Response({"detail": "Refresh token không hợp lệ hoặc đã hết hạn"}, status=401)

        token_data = token_response.json()
        response = Response({
            "access_token": token_data["access_token"],
            "expires_in": token_data["expires_in"],
            "token_type": token_data["token_type"],
        })
        response.set_cookie(
            key="refresh_token",
            value=token_data["refresh_token"],
            httponly=True,
            secure=True,
            samesite="None",
            max_age=60 * 60 * 24 * 7,
            path="/api/token/refresh/",
        )
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")
        if refresh_token:
            requests.post(
                request.build_absolute_uri("/o/revoke_token/"),
                data={
                    "token": refresh_token,
                    "client_id": settings.OAUTH_CLIENT_ID,
                    "client_secret": settings.OAUTH_CLIENT_SECRET,
                },
            )
        response = Response({"detail": "Đã đăng xuất"})
        response.delete_cookie("refresh_token", path="/api/token/refresh/")
        return response
