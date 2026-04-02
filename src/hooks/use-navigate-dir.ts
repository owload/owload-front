import { ROOT_NODE_ID } from "@/engine";
import { useNavigate, useParams } from "react-router-dom";

export function useNavigateDir() {
    const navigate = useNavigate();
    const getNavigateDirUrl = useGetNavigateDirUrl();

    function navigateDir(dirId: string){
        navigate(getNavigateDirUrl(dirId));
    }

    return navigateDir;
}

export function useGetNavigateDirUrl() {
    const { driveId } = useParams();
    function getNavigateDirUrl(dirId: string) {
        if(dirId === ROOT_NODE_ID) {
            return `/drive/${driveId}`;
        } else {
            return `/drive/${driveId}/${encodeURIComponent(dirId)}`;
        }
    }
    return getNavigateDirUrl;
}
