import { useLocation, useNavigate } from "react-router-dom";

export function useActivateMobileSelectMode() {
    const navigate = useNavigate();
    return async function () {
        await navigate("#selectmode", { replace: false });
    }
}

export function useIsMobileSelectModeOn() {
    const location = useLocation();
    return location.hash === "#selectmode";
}

export function useDeactivateMobileSelectMode() {
    const navigate = useNavigate();
    const isMobileSelectModeOn = useIsMobileSelectModeOn();
    return async () => {
        if (isMobileSelectModeOn) {
            await navigate(-1);
        }
    };
}
