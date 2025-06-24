import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
const NavItem = ({ to, children }) => (_jsx(NavLink, { to: to, className: ({ isActive }) => `relative font-serif text-lg tracking-wider text-stone-600 hover:text-stone-900 transition-colors duration-300 ${isActive ? 'text-stone-900' : ''}`, children: ({ isActive }) => (_jsxs(_Fragment, { children: [children, isActive && (_jsx(motion.div, { className: "absolute -bottom-1 left-0 right-0 h-[1px] bg-stone-500", layoutId: "underline", initial: false, animate: { opacity: 1 } }))] })) }));
export const Navbar = () => {
    const { isAuthenticated } = useAuth();
    return (_jsx("header", { className: "py-8", children: _jsxs("nav", { className: "container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center", children: [_jsx(NavLink, { to: isAuthenticated ? '/root' : '/', className: "font-display text-3xl font-bold text-stone-800", children: "Keeper" }), _jsx("div", { className: "flex items-center space-x-12", children: isAuthenticated ? (_jsxs(_Fragment, { children: [_jsx(NavItem, { to: "/root", children: "Root" }), _jsx(NavItem, { to: "/journeys", children: "Journeys" }), _jsx(NavItem, { to: "/moments", children: "Moments" }), _jsx(NavItem, { to: "/themes", children: "Themes" })] })) : (_jsxs(_Fragment, { children: [_jsx(NavItem, { to: "/", children: "Home" }), _jsx(NavItem, { to: "/register", children: "Begin" }), _jsx(NavItem, { to: "/login", children: "Login" })] })) })] }) }));
};
//# sourceMappingURL=Navbar.js.map