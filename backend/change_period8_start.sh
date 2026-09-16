#!/bin/bash
# Change registration start date of Period Dot 8 to 10/09/2026

python manage.py shell -c "
import sys; sys.stdout.reconfigure(encoding='utf-8')
from django.utils import timezone
from datetime import datetime
from theses.models import RegistrationPeriod

period = RegistrationPeriod.objects.filter(
    name__icontains='Dot 8',
    period_type=RegistrationPeriod.PeriodType.PROJECT,
).first()

if period is None:
    print('Not found Dot 8!')
else:
    old_start = period.student_registration_start
    new_start = timezone.make_aware(datetime(2026, 9, 10, 0, 0, 0))
    period.student_registration_start = new_start
    period.save()
    print(f'Updated Dot 8 registration start:')
    print(f'  Old: {old_start}')
    print(f'  New: {period.student_registration_start}')
    print(f'  End (computed): {period.student_registration_end}')
"
