import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const Base_URL = import.meta.env.VITE_API_URL as string;

export const endpoints = {
    'login': '/api/login/',
    'tokenRefresh': '/api/token/refresh/',
    'logoutApi': '/api/logout/',
    'csrf': '/api/csrf/',
    'profile': 'api/users/profile/',
    'myTopic': 'api/users/topics/',
    'TopicDetail': (id: string | number) => `api/users/topics/${id}/`,
    'lecturers': 'api/lecturers/',
    'lecturersDetail': (idLectures: string | number) => `api/lecturers/${idLectures}/`,
    'topic': (idLectures: string | number) => `api/lecturers/${idLectures}/topics/`,
    'topicDetail': (idLectures: string | number, idTopic: string | number) => `api/lecturers/${idLectures}/topics/${idTopic}/`,
    'registrationPeriods': 'api/registration-periods/',
    'registrationPeriodDetail': (periodId: string | number) => `api/registration-periods/${periodId}/`,
    'publishPeriod': (periodId: string | number) => `api/registration-periods/${periodId}/publish/`,
    'reportMatrix': (periodId: string | number) => `api/registration-periods/${periodId}/report-matrix/`,
    'createThesis': (periodId: string | number) => `api/registration-periods/${periodId}/create-thesis/`,
    'schedules': (periodId: string | number) => `api/registration-periods/${periodId}/schedules/`,
    'scheduleDetail': (periodId: string | number, scheduleId: string | number) => `api/registration-periods/${periodId}/schedules/${scheduleId}/`,
    'registrations': (periodId: string | number) => `api/registration-periods/${periodId}/registrations/`,
    'registrationDetail': (periodId: string | number, regId: string | number) => `api/registration-periods/${periodId}/registrations/${regId}/`,
    'approveRegistration': (periodId: string | number, regId: string | number) => `api/registration-periods/${periodId}/registrations/${regId}/approve/`,
    'rejectRegistration': (periodId: string | number, regId: string | number) => `api/registration-periods/${periodId}/registrations/${regId}/reject/`,
    'addLecturer': (periodId: string | number, regId: string | number) => `api/registration-periods/${periodId}/registrations/${regId}/add_lecturer/`,
    'registrationsThesis': (periodId: string | number) => `api/registration-periods/${periodId}/registrations-thesis/`,
    'convertToThesis': (periodId: string | number) => `api/registration-periods/${periodId}/convert-to-thesis/`,
    'specialization': 'api/specialization/',
    'reports': 'api/reports/',
    'uploadFinalReport': 'api/reports/upload-final/',
    'finalReport': 'api/reports/final/',
    'reportDetail': (id: string | number) => `api/reports/${id}/detail/`,
    'reportDownload': (id: string | number) => `api/reports/${id}/download/`,
    'reviewReport': (id: string | number) => `api/reports/${id}/review/`,
    'scheduleItem': (scheduleId: string | number) => `api/schedules/${scheduleId}/`,
    'uploadPeriodicReport': (scheduleId: string | number) => `api/schedules/${scheduleId}/report/`,
    'myCommittees': 'api/users/my-committees/',
    'myCommitteeDetail': (id: string | number) => `api/users/my-committees/${id}/`,
    'myReviewerSessions': 'api/users/my-reviewer-sessions/',
    'myReviewerSessionDetail': (id: string | number) => `api/users/my-reviewer-sessions/${id}/`,
    'myRegistrationPeriods': 'api/users/my-registration-periods/',
    'notifications': 'api/notifications/',
    'notificationItem': (id: number) => `api/notifications/${id}/`,
    'notificationReadAll': 'api/notifications/read-all/',
    'grades': 'api/grades/',
    'gradeByRegistration': (registrationId: string | number) => `api/grades/by-registration/?registration=${registrationId}`,
    'gradeDetail': (id: string | number) => `api/grades/${id}/`,
    'committees': (periodId: string | number) => `api/registration-periods/${periodId}/committees/`,
    'committeeDetail': (periodId: string | number, committeeId: string | number) => `api/registration-periods/${periodId}/committees/${committeeId}/`,
    'reviewerSessions': (periodId: string | number) => `api/registration-periods/${periodId}/reviewer-sessions/`,
    'reviewerSessionDetail': (periodId: string | number, sessionId: string | number) => `api/registration-periods/${periodId}/reviewer-sessions/${sessionId}/`,
    'reviewerEligibleRegistrations': (periodId: string | number) => `api/registration-periods/${periodId}/reviewer-eligible-registrations/`,
};

const api = axios.create({
    baseURL: Base_URL,
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

let isRefreshing = false;
let refreshQueue: (() => void)[] = [];

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const remember = localStorage.getItem("isRefreshing") === "true";
            if (!remember) {
                localStorage.removeItem("access_token");
                window.location.href = "/login";
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise((resolve) => {
                    refreshQueue.push(() => resolve(api(originalRequest)));
                });
            }

            isRefreshing = true;
            try {
                const res = await axios.post(
                    `${Base_URL}/api/token/refresh/`,
                    {},
                    { withCredentials: true }
                );
                localStorage.setItem("access_token", res.data.access_token);
                refreshQueue.forEach((cb) => cb());
                refreshQueue = [];
                return api(originalRequest);
            } catch (refreshError) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("isRefreshing");
                refreshQueue = [];
                window.location.href = "/login";
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
        return Promise.reject(error);
    }
);

export default api;
