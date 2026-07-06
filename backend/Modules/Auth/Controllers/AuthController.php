<?php

namespace Rafeeq\Modules\Auth\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Auth\Requests\ConfirmMfaRequest;
use Rafeeq\Modules\Auth\Requests\ForgotPasswordRequest;
use Rafeeq\Modules\Auth\Requests\LoginRequest;
use Rafeeq\Modules\Auth\Requests\RegisterRequest;
use Rafeeq\Modules\Auth\Requests\RequestOtpRequest;
use Rafeeq\Modules\Auth\Requests\ResendOtpRequest;
use Rafeeq\Modules\Auth\Requests\ResetPasswordRequest;
use Rafeeq\Modules\Auth\Requests\VerifyMfaRequest;
use Rafeeq\Modules\Auth\Requests\VerifyOtpRequest;
use Rafeeq\Modules\Auth\Resources\UserResource;
use Rafeeq\Modules\Auth\Services\AuthService;
use Rafeeq\Modules\Auth\Services\MfaService;
use Rafeeq\Modules\Auth\Services\OtpService;
use Rafeeq\Modules\Drivers\Services\DriverService;
use Rafeeq\Shared\Enums\OtpChannel;
use Rafeeq\Shared\Enums\UserType;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $auth, private readonly MfaService $mfa) {}

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

        // MFA-enabled accounts using the passwordless login path must still pass
        // the second factor before a token is issued.
        if ($result['mfa_required']) {
            return $this->ok([
                'mfa_required' => true,
                'mfa_token' => $result['mfa_token'],
            ], 'أدخل رمز المصادقة الثنائية لإكمال الدخول.');
        }

        return $this->ok([
            'mfa_required' => false,
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
        $code = app(OtpService::class)->issue(
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

        if ($result['mfa_required']) {
            return $this->ok([
                'mfa_required' => true,
                'mfa_token' => $result['mfa_token'],
            ], 'أدخل رمز المصادقة الثنائية لإكمال الدخول.');
        }

        return $this->ok([
            'mfa_required' => false,
            'user' => new UserResource($result['user']),
            'token' => $result['token'],
            'token_type' => 'Bearer',
        ], 'تم تسجيل الدخول.');
    }

    public function verifyMfa(VerifyMfaRequest $request): JsonResponse
    {
        $result = $this->auth->verifyMfaChallenge(
            mfaToken: $request->input('mfa_token'),
            code: $request->input('code'),
            deviceName: $request->input('device_name'),
            request: $request,
        );

        return $this->ok([
            'user' => new UserResource($result['user']),
            'token' => $result['token'],
            'token_type' => 'Bearer',
        ], 'تم تسجيل الدخول.');
    }

    /* ── MFA management (authenticated) ──────────────────────────────── */

    public function mfaSetup(Request $request): JsonResponse
    {
        $data = $this->mfa->beginSetup($request->user());

        return $this->ok($data, 'امسح رمز QR في تطبيق المصادقة ثم أكّد بالرمز.');
    }

    public function mfaConfirm(ConfirmMfaRequest $request): JsonResponse
    {
        $recoveryCodes = $this->mfa->confirmSetup($request->user(), $request->input('code'));

        return $this->ok([
            'recovery_codes' => $recoveryCodes,
        ], 'تم تفعيل المصادقة الثنائية. احفظ رموز الاسترداد في مكان آمن.');
    }

    public function mfaDisable(ConfirmMfaRequest $request): JsonResponse
    {
        $this->mfa->disable($request->user(), $request->input('code'));

        return $this->ok(null, 'تم إيقاف المصادقة الثنائية.');
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

    /**
     * Add the "captain" (driver) capability to the CURRENT account.
     *
     * Enables one phone number to be both a student and a captain: instead of
     * forcing a separate account, an authenticated user gains the `driver`
     * role and a driver profile (idempotent). The student keeps their existing
     * roles/data. This is what the captain app calls after a user with an
     * existing Rafeeq account signs in.
     */
    public function becomeDriver(Request $request, DriverService $drivers): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole(UserType::Driver->value)) {
            $user->assignRole(UserType::Driver->value);
        }

        // Ensure a driver profile exists (firstOrCreate — safe to repeat).
        $drivers->forUser($user);

        return $this->ok(
            new UserResource($user->fresh('roles')),
            'تم تفعيل صفة الكابتن لحسابك.',
        );
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
