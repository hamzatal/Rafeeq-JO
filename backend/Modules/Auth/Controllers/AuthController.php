<?php

namespace Rafeeq\Modules\Auth\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Auth\Requests\ForgotPasswordRequest;
use Rafeeq\Modules\Auth\Requests\LoginRequest;
use Rafeeq\Modules\Auth\Requests\RegisterRequest;
use Rafeeq\Modules\Auth\Requests\RequestOtpRequest;
use Rafeeq\Modules\Auth\Requests\ResendOtpRequest;
use Rafeeq\Modules\Auth\Requests\ResetPasswordRequest;
use Rafeeq\Modules\Auth\Requests\VerifyOtpRequest;
use Rafeeq\Modules\Auth\Resources\UserResource;
use Rafeeq\Modules\Auth\Services\AuthService;
use Rafeeq\Shared\Enums\OtpChannel;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $auth) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->auth->register($request->validated(), $request);

        return $this->created([
            'user' => new UserResource($result['user']),
            'otp_debug' => $result['otp_debug'],
        ], 'تم إنشاء الحساب. أدخل رمز التحقق المُرسل إلى هاتفك.');
    }

    public function verifyOtp(VerifyOtpRequest $request): JsonResponse
    {
        $result = $this->auth->verifyOtp(
            phone: $request->input('phone'),
            code: $request->input('code'),
            purpose: $request->purpose(),
            deviceName: $request->input('device_name'),
            request: $request,
        );

        return $this->ok([
            'user' => new UserResource($result['user']),
            'token' => $result['token'],
            'token_type' => 'Bearer',
        ], 'تم التحقق بنجاح.');
    }

    public function requestOtp(RequestOtpRequest $request): JsonResponse
    {
        $code = $this->auth->requestLoginOtp($request->input('phone'), $request);

        return $this->ok(['otp_debug' => $code], 'تم إرسال رمز الدخول إلى هاتفك.');
    }

    public function resendOtp(ResendOtpRequest $request): JsonResponse
    {
        $code = app(\Rafeeq\Modules\Auth\Services\OtpService::class)->issue(
            identifier: $request->input('phone'),
            purpose: $request->purpose(),
            channel: OtpChannel::Sms,
            request: $request,
        );

        return $this->ok(['otp_debug' => $code], 'تم إعادة إرسال الرمز.');
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->auth->login(
            phone: $request->input('phone'),
            password: $request->input('password'),
            deviceName: $request->input('device_name'),
            request: $request,
        );

        return $this->ok([
            'user' => new UserResource($result['user']),
            'token' => $result['token'],
            'token_type' => 'Bearer',
        ], 'تم تسجيل الدخول.');
    }

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $code = $this->auth->forgotPassword($request->input('phone'), $request);

        return $this->ok(
            ['otp_debug' => $code],
            'إذا كان الرقم مسجّلاً، فستصلك رسالة بإعادة التعيين.',
        );
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $this->auth->resetPassword(
            phone: $request->input('phone'),
            code: $request->input('code'),
            password: $request->input('password'),
            request: $request,
        );

        return $this->ok(null, 'تم تغيير كلمة المرور. سجّل الدخول من جديد.');
    }

    public function me(Request $request): JsonResponse
    {
        return $this->ok(new UserResource($request->user()->load('roles')));
    }

    public function logout(Request $request): JsonResponse
    {
        $this->auth->logout($request->user(), $request->user()->currentAccessToken()?->id);

        return $this->ok(null, 'تم تسجيل الخروج.');
    }

    public function logoutAll(Request $request): JsonResponse
    {
        $this->auth->logoutAll($request->user());

        return $this->ok(null, 'تم تسجيل الخروج من جميع الأجهزة.');
    }
}
