import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
const ProtectedRoute = () => {
    const { isAuthenticated, isLoading } = useAuth();
    if (isLoading) {
        return _jsx("div", { children: "Loading..." }); // Or a spinner component
    }
    return isAuthenticated ? _jsx(Outlet, {}) : _jsx(Navigate, { to: "/login", replace: true });
};
function App() {
    return (_jsx("div", { className: "h-screen w-screen bg-red-500 text-white flex items-center justify-center text-2xl font-bold", children: "If you can see this red screen, Tailwind CSS is working." }));
}
export default App;
//# sourceMappingURL=app-old.js.map