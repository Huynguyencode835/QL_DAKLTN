import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Home from "../pages/Home";
import Profile from "../pages/Profile";
import TopicRegistration from "../pages/TopicRegistration";
import ListStudentsAndRegistration from "../pages/ListStudentAndRegistration";
import TopicManagement from "../pages/TopicManagement";
import RegistrationPeriodManagement from "../pages/RegistrationPeriodManagement";
import LoginForm from "../pages/Login";
import NotFound from "../pages/NotFound"
import { UserProvider } from "../contexts/UserContext";
import { ModalProvider } from "../contexts/ModalContext";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <UserProvider><ModalProvider><MainLayout /></ModalProvider></UserProvider>,
        children: [
            {index: true, element: <Home />},
            {path: "profile", element: <Profile />},
            {path: "topic-registration", element: <TopicRegistration />},
            {path: "students", element: <ListStudentsAndRegistration />},
            {path: "topic-management", element: <TopicManagement />},
            {path: "registration-periods", element: <RegistrationPeriodManagement />},
        ]
    },
    {path: "login", element: <UserProvider><LoginForm /></UserProvider>},
    { path: "*", element: <NotFound/> }
])
