<?php

namespace Rafeeq\Modules\Users\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Auth\Resources\UserResource;
use Rafeeq\Modules\Users\Requests\ChangePasswordRequest;
use Rafeeq\Modules\Users\Requests\ConfirmPhoneChangeRequest;
use Rafeeq\Modules\Users\Requests\RequestPhoneChangeRequest;
use Rafeeq\Modules\Users\Requests\UpdateProfileRequest;
use Rafeeq\Modules\Users\Services\ProfileService;

class ProfileController extends Controller
{
    public function __construct(private readonly ProfileService $profile) {}

    public function show(Request $request): JsonResponse
    {
        return $this->ok(new UserResource($request->user()->load('roles')));
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $this->profile->update($request->user(), $request->validated());

        return $this->ok(new UserResource($user), 'تم تحديث الملف الشخصي.');
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $this->profile->changePassword(
            $request->user(),
            $request->input('current_password'),
            $request->input('password'),
        );

        return $this->ok(null, 'تم تغيير كلمة المرور.');
    }

    public function requestPhoneChange(RequestPhoneChangeRequest $request): JsonResponse
    {
        $code = $this->profile->requestPhoneChange($request->user(), $request->input('phone'));

        return $this->ok(['otp_debug' => $code], 'تم إرسال رمز التحقق إلى الرقم الجديد.');
    }

    public function confirmPhoneChange(ConfirmPhoneChangeRequest $request): JsonResponse
    {
        $user = $this->profile->confirmPhoneChange(
            $request->user(),
            $request->input('phone'),
            $request->input('code'),
        );

        return $this->ok(new UserResource($user), 'تم تغيير رقم الهاتف.');
    }

    public function destroy(Request $request): JsonResponse
    {
        $this->profile->deleteAccount($request->user());

        return $this->ok(null, 'تم حذف الحساب.');
    }
}
