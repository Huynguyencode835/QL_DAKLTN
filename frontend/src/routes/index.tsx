import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Home from "../pages/Home";
import Profile from "../pages/Profile";
import TopicRegistration from "../pages/Student/TopicRegistration";
import ListStudentsAndRegistration from "../pages/ListStudentAndRegistration";
import TopicManagement from "../pages/Lecturer/TopicManagement";
import RegistrationPeriodManagement from "../pages/Staff/RegistrationPeriodManagement";
import ReportsUpLoad from "../pages/Student/ReportsUpLoad";
import LoginForm from "../pages/Login";
import NotFound from "../pages/NotFound"
import { UserProvider } from "../contexts/UserContext";
import { ModalProvider } from "../contexts/ModalContext";
import { PageHeaderProvider } from "../contexts/PageHeaderContext";
import { ToastProvider } from "../contexts/ToastContext";
import { PeriodProvider } from "../contexts/PeriodContext";
import PeriodStatusPage from "../pages/Period";
import { Children } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import GradesAndResults from "../pages/GradesAndResults";
import ReportSchedule from "../pages/Lecturer/ReportSchedule";
import ReportsManagement from "../pages/ReportsManagement"

export const router = createBrowserRouter([
    {
        path: "/",
        element: (
            <UserProvider>
                <ToastProvider>
                    <ModalProvider>
                        <PageHeaderProvider>
                            <PeriodProvider>
                                <MainLayout />
                            </PeriodProvider>
                        </PageHeaderProvider>
                    </ModalProvider>
                </ToastProvider>
            </UserProvider>
        ),
        children: [
            {
                element: <ProtectedRoute />,
                children: [
                    { index: true, element: <Home /> },
                    { path: "profile", element: <Profile /> },
                    { path: "topic-registration", element: <TopicRegistration /> },
                    { path: "reports", element: <ReportsUpLoad /> },
                    { path: "students", element: <ListStudentsAndRegistration /> },
                    { path: "topic-management", element: <TopicManagement /> },
                    { path: "registration-periods", element: <RegistrationPeriodManagement /> },
                    { path: "period", element: <PeriodStatusPage /> },
                    { path : "grades-and-results", element: <GradesAndResults />},
                    { path : "report-schedule", element: <ReportSchedule />},
                    { path : "reports-management", element: <ReportsManagement/>}

                ]
            }
        ]
    },
    { path: "login", element: <UserProvider><ToastProvider><LoginForm /></ToastProvider></UserProvider> },
    { path: "*", element: <NotFound /> }
])
