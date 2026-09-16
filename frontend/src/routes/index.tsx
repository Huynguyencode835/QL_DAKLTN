import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Home from "../pages/Home";
import Profile from "../pages/Profile";
import TopicRegistration from "../pages/Student/TopicRegistration";
import ListStudentsAndRegistration from "../pages/ListStudentAndRegistration";
import TopicManagement from "../pages/Lecturer/TopicManagement";
import RegistrationPeriodManagement from "../pages/Staff/RegistrationPeriodManagement";
import ReportsUpLoad from "../pages/Student/ReportsUpLoad";
import MyDefenseSchedules from "../pages/Student/MyDefenseSchedules";
import LoginForm from "../pages/Login";
import NotFound from "../pages/NotFound"
import { UserProvider } from "../contexts/UserContext";
import { ModalProvider } from "../contexts/ModalContext";
import { PageHeaderProvider } from "../contexts/PageHeaderContext";
import { ToastProvider } from "../contexts/ToastContext";
import { PeriodProvider } from "../contexts/PeriodContext";
import PeriodStatusPage from "../pages/Period";
import ProtectedRoute from "../components/ProtectedRoute";
import GradesAndResults from "../pages/GradesAndResults";
import ReportSchedule from "../pages/Lecturer/ReportSchedule";
import ReportsManagement from "../pages/ReportsManagement"
import MyCommittees from "../pages/Lecturer/MyCommittees";
import CommitteeDetail from "../pages/Lecturer/CommitteeDetail";
import CommitteeManagement from "../pages/Staff/CommitteeManagement";
import ManageReviewerSessions from "../pages/Staff/ManageReviewerSessions";
import ReviewerSessionDetail from "../pages/Lecturer/ReviewerSessionDetail";
import MyReviewerSessions from "../pages/Lecturer/MyReviewerSessions";

const ALL_ROLES = ['student', 'lecturer', 'staff', 'admin'] as const;

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
                    { index: true, element: <Home />, handle: { roles: [...ALL_ROLES] } },
                    { path: "profile", element: <Profile />, handle: { roles: [...ALL_ROLES] } },
                    { path: "period", element: <PeriodStatusPage />, handle: { roles: ['student', 'lecturer', 'staff', 'admin'] } },
                    { path: "grades-and-results", element: <GradesAndResults />, handle: { roles: ['student', 'lecturer', 'staff', 'admin'] } },
                    { path: "reports-management", element: <ReportsManagement />, handle: { roles: ['lecturer', 'staff', 'admin'] } },

                    // Student only
                    { path: "topic-registration", element: <TopicRegistration />, handle: { roles: ['student'] } },
                    { path: "reports", element: <ReportsUpLoad />, handle: { roles: ['student'] } },
                    { path: "my-defense-schedules", element: <MyDefenseSchedules />, handle: { roles: ['student'] } },

                    // Lecturer only
                    { path: "students", element: <ListStudentsAndRegistration />, handle: { roles: ['lecturer', 'staff', 'admin'] } },
                    { path: "topic-management", element: <TopicManagement />, handle: { roles: ['lecturer'] } },
                    { path: "report-schedule", element: <ReportSchedule />, handle: { roles: ['lecturer'] } },
                    { path: "my-committees", element: <MyCommittees />, handle: { roles: ['lecturer'] } },
                    { path: "my-committees/:id", element: <CommitteeDetail />, handle: { roles: ['lecturer'] } },
                    { path: "my-reviewer-sessions", element: <MyReviewerSessions />, handle: { roles: ['lecturer'] } },
                    { path: "my-reviewer-sessions/:id", element: <ReviewerSessionDetail />, handle: { roles: ['lecturer'] } },

                    // Staff only
                    { path: "registration-periods", element: <RegistrationPeriodManagement />, handle: { roles: ['staff', 'admin'] } },
                    { path: "manage-committees", element: <CommitteeManagement />, handle: { roles: ['staff'] } },
                    { path: "manage-reviewer-sessions", element: <ManageReviewerSessions />, handle: { roles: ['staff'] } },
                ]
            }
        ]
    },
    { path: "login", element: <UserProvider><ToastProvider><LoginForm /></ToastProvider></UserProvider> },
    { path: "*", element: <NotFound /> }
])
