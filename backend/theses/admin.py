from django.contrib import admin

from theses.models import User, Faculty, Major, Specialization
from theses.models import StudentProfile, LecturerProfile, StaffProfile
from theses.models import ListOfTopics, ProjectRegistration, RegistrationPeriod


admin.site.register(User)
admin.site.register(Faculty)
admin.site.register(Major)
admin.site.register(Specialization)
admin.site.register(StudentProfile)
admin.site.register(LecturerProfile)
admin.site.register(StaffProfile)
admin.site.register(ListOfTopics)
admin.site.register(ProjectRegistration)
admin.site.register(RegistrationPeriod)
