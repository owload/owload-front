import './App.css'
import { NavBar } from './components/nav-bar'
import { BrowserRouter, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useFilesStore } from './stores/files-store';
import { StrictMode, useEffect } from 'react';
import { DrivesPage } from './pages/drives-page';
import { DriveExplorerPage } from './pages/drive-explorer-page';
import { CreateDrivePage } from './pages/create-drive-page';
import { SidebarProvider } from './components/ui/sidebar';
import { AppSidebar } from './components/sidebar/app-sidebar';
import { FsOpsDialog } from './components/fs-dialogs/fs-ops-dialog';
import { DriveExplorerArea } from './components/files-area/drive-explore-area';
import { DriveLogs } from './components/drive-logs/drive-logs';

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.hash) {
      navigate(location.pathname + location.search, { replace: true });
    }
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className='w-full relative'>
        <NavBar />
        <Outlet />
      </div>
      <FsOpsDialog />
    </SidebarProvider>
  );
}

function App() {

  const updateDrives = useFilesStore((state) => state.updateDrives);

  useEffect(() => {
    updateDrives();
  }, []);

  return (
    <StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<DrivesPage />} />
            <Route path="/drive/:driveId" element={<DriveExplorerPage />}>
              <Route path="/drive/:driveId/:dirId?" element={<DriveExplorerArea />} />
              <Route path="/drive/:driveId/logs" element={<DriveLogs />}></Route>
            </Route>
          </Route>
          <Route path="/create" element={<Layout />}>
            <Route index element={<CreateDrivePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StrictMode>
  )
}

export default App;
