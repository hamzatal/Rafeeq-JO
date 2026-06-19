<?php

namespace Rafeeq\Shared\Enums;

enum DocumentType: string
{
    use \Rafeeq\Shared\Enums\Concerns\LocalizedLabel;

    case NationalId = 'national_id';
    case License = 'license';
    case VehicleRegistration = 'vehicle_registration';
    case Insurance = 'insurance';
    case CriminalRecord = 'criminal_record';
    case Photo = 'photo';

    public function labelAr(): string
    {
        return match ($this) {
            self::NationalId => 'الهوية الوطنية',
            self::License => 'رخصة القيادة',
            self::VehicleRegistration => 'دفتر المركبة',
            self::Insurance => 'التأمين',
            self::CriminalRecord => 'عدم محكومية',
            self::Photo => 'صورة شخصية',
        };
    }

    public function labelEn(): string
    {
        return match ($this) {
            self::NationalId => 'National ID',
            self::License => 'Driving license',
            self::VehicleRegistration => 'Vehicle registration',
            self::Insurance => 'Insurance',
            self::CriminalRecord => 'Criminal record',
            self::Photo => 'Photo',
        };
    }

    /** Documents required before a driver can be approved. */
    public static function requiredForApproval(): array
    {
        return [self::NationalId, self::License];
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
