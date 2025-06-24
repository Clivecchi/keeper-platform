import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RootKeeperPage from './pages/RootKeeperPage';
import DebugButton from './components/DebugButton';
import DebugPage from './pages/DebugPage';
const App = () => {
    return (_jsxs(_Fragment, { children: [_jsxs(Routes, { children: [_jsx(Route, { element: _jsx(AppLayout, {}), children: _jsx(Route, { path: "/root", element: _jsx(RootKeeperPage, {}) }) }), _jsx(Route, { path: "/", element: _jsx(LandingPage, {}) }), _jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/register", element: _jsx(RegisterPage, {}) }), _jsx(Route, { path: "/debug", element: _jsx(DebugPage, {}) })] }), _jsx(DebugButton, {})] }));
};
export default App;
//# sourceMappingURL=App.js.map