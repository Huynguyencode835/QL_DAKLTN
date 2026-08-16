import axios from "axios";

const Base_URL = import.meta.env.VITE_API_URL as string;

export const endpoints = {
    'login': '/o/token/',
    'logout': '/o/revoke_token/',
    'profile': 'api/users/profile/',
    'myTopic': 'api/users/topics/',
    'TopicDetail': (id: string | number) => `api/users/topics/${id}/`,
    'lecturers': 'api/lecturers/',
    'lecturersDetail': (idLectures: string | number) => `api/lecturers/${idLectures}/`,
    'topic': (idLectures: string | number) => `api/lecturers/${idLectures}/topics/`,
    'topicDetail': (idLectures: string | number, idTopic: string | number) => `api/lecturers/${idLectures}/topics/${idTopic}`,
    'registrationPeriods': 'api/registration-periods/',
    'registrationPeriodDetail': (periodId: string | number) => `api/registration-periods/${periodId}/`,
    'registrations': (periodId: string | number) => `api/registration-periods/${periodId}/registrations/`,
    'registrationDetail': (periodId: string | number, regId: string | number) => `api/registration-periods/${periodId}/registrations/${regId}/`,
    'approveRegistration': (periodId: string | number, regId: string | number) => `api/registration-periods/${periodId}/registrations/${regId}/approve/`,
    'rejectRegistration': (periodId: string | number, regId: string | number) => `api/registration-periods/${periodId}/registrations/${regId}/reject/`,
    'addLecturer': (periodId: string | number, regId: string | number) => `api/registration-periods/${periodId}/registrations/${regId}/add_lecturer/`,
    'specialization': 'api/specialization/',
    'reports': 'api/reports/',
    'reportDownload': (id: string | number) => `api/reports/${id}/download/`,
};


export const authApis = (token: string | null) => {
    const instance = axios.create({ baseURL: Base_URL });

    instance.interceptors.request.use((config) => {
        const accessToken = token || localStorage.getItem('token') || localStorage.getItem('access_token');
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    });

    return instance;
};

export default axios.create({
    baseURL: Base_URL,
});
