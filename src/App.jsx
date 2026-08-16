import { useState, useEffect } from 'react';
import { useRoutines } from './hooks/useRoutines.js';
import { useWorkouts } from './hooks/useWorkouts.js';
import { useCalendar } from './hooks/useCalendar.js';
import { useGarmin } from './hooks/useGarmin.js';
import { initAuth, getCurrentUser, logoutUser } from './hooks/useAuth.js';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import RoutineList from './pages/RoutineList.jsx';
import RoutineDetail from './pages/RoutineDetail.jsx';
import RoutineForm from './pages/RoutineForm.jsx';
import WorkoutSession from './pages/WorkoutSession.jsx';
import CalendarView from './pages/CalendarView.jsx';
import GarminView from './pages/GarminView.jsx';
import UserProfile from './pages/UserProfile.jsx';
import JournalView from './pages/JournalView.jsx';
import CoachView from './pages/CoachView.jsx';
import NutritionView from './pages/NutritionView.jsx';
import ExerciseLibraryView from './pages/ExerciseLibraryView.jsx';
import LoginView from './pages/LoginView.jsx';
import UsersView from './pages/UsersView.jsx';
import './styles/app.css';

function AppShell({ user, onLogout }) {
  const { routines, loading, error, addRoutine, updateRoutine, deleteRoutine, importRoutines } = useRoutines(user);
  const { workouts, addWorkout, updateWorkout, deleteWorkout } = useWorkouts(user);
  const { events: calendarEvents, addEvent, removeEvent } = useCalendar(user);
  const { activities: garminActivities } = useGarmin(50);
  const [view, setView] = useState('dashboard');
  const [editingId, setEditingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [workoutRoutineId, setWorkoutRoutineId] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const editingRoutine = editingId ? routines.find((r) => r.id === editingId) ?? null : null;
  const viewingRoutine = viewingId ? routines.find((r) => r.id === viewingId) ?? null : null;
  const workoutRoutine = workoutRoutineId ? routines.find((r) => r.id === workoutRoutineId) ?? null : null;

  const sidebarView = view === 'workout' ? 'list' : view;

  function handleNavigate(viewId) {
    if (viewId === 'logout') {
      logoutUser();
      onLogout();
      return;
    }
    setSaveError(null);
    if (viewId === 'list') {
      setEditingId(null);
      setViewingId(null);
    }
    setView(viewId);
  }

  function handleNew() {
    setEditingId(null);
    setSaveError(null);
    setView('form');
  }

  function handleView(id) {
    setViewingId(id);
    setView('detail');
  }

  function handleEdit(id) {
    setEditingId(id);
    setSaveError(null);
    setView('form');
  }

  function handleEditFromDetail() {
    setEditingId(viewingId);
    setViewingId(null);
    setSaveError(null);
    setView('form');
  }

  function handleBackFromDetail() {
    setViewingId(null);
    setView('list');
  }

  function handleStartWorkout(id) {
    setWorkoutRoutineId(id);
    setView('workout');
  }

  function handleFinishWorkout() {
    setWorkoutRoutineId(null);
    setViewingId(null);
    setView('dashboard');
  }

  function handleAbortWorkout() {
    setWorkoutRoutineId(null);
    setView('detail');
  }

  async function handleSave(routine) {
    setSaveError(null);
    try {
      if (editingId) {
        await updateRoutine(editingId, routine);
      } else {
        await addRoutine(routine);
      }
      setView('list');
      setEditingId(null);
    } catch {
      setSaveError('Speichern fehlgeschlagen. Ist das Backend erreichbar?');
    }
  }

  function handleCancel() {
    setView('list');
    setEditingId(null);
    setSaveError(null);
  }

  return (
    <div className="app-layout">
      <Sidebar view={sidebarView} onNavigate={handleNavigate} username={user} />

      <main className="app-main theme-light">
        {view === 'dashboard' && <Dashboard workouts={workouts} routines={routines} calendarEvents={calendarEvents} garminActivities={garminActivities} onStartWorkout={handleStartWorkout} />}
        {view === 'garmin' && <GarminView />}
        {view === 'profile' && <UserProfile username={user} />}
        {view === 'users' && <UsersView currentUser={user} />}
        {view === 'coach' && (
          <CoachView
            username={user}
            workouts={workouts}
            routines={routines}
            calendarEvents={calendarEvents}
            garminActivities={garminActivities}
          />
        )}
        {view === 'journal' && (
          <JournalView
            workouts={workouts}
            addWorkout={addWorkout}
            updateWorkout={updateWorkout}
            deleteWorkout={deleteWorkout}
            routines={routines}
            garminActivities={garminActivities}
          />
        )}
        {view === 'week' && (
          <CalendarView
            events={calendarEvents}
            routines={routines}
            addEvent={addEvent}
            removeEvent={removeEvent}
          />
        )}

        {view === 'workout' && workoutRoutine && (
          <div className="routines-page">
            <WorkoutSession
              routine={workoutRoutine}
              workouts={workouts}
              addWorkout={addWorkout}
              onFinish={handleFinishWorkout}
              onAbort={handleAbortWorkout}
            />
          </div>
        )}

        {view === 'nutrition' && (
          <NutritionView username={user} calendarEvents={calendarEvents} />
        )}

        {view === 'exercises' && <ExerciseLibraryView />}

        {view !== 'dashboard' && view !== 'workout' && view !== 'week' &&
         view !== 'garmin' && view !== 'profile' && view !== 'journal' &&
         view !== 'coach' && view !== 'users' && view !== 'nutrition' &&
         view !== 'exercises' && (
          <div className="routines-page">
            {error && <div className="api-error">{error}</div>}

            {view === 'list' && (
              loading
                ? <div className="loading-state">Routinen werden geladen…</div>
                : <RoutineList
                    routines={routines}
                    onNew={handleNew}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={deleteRoutine}
                    onImport={importRoutines}
                  />
            )}

            {view === 'detail' && viewingRoutine && (
              <RoutineDetail
                routine={viewingRoutine}
                onBack={handleBackFromDetail}
                onEdit={handleEditFromDetail}
                onStartWorkout={() => handleStartWorkout(viewingId)}
              />
            )}

            {view === 'form' && (
              <RoutineForm
                routine={editingRoutine}
                onSave={handleSave}
                onCancel={handleCancel}
                saveError={saveError}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    initAuth().then(() => {
      const current = getCurrentUser();
      setUser(current);
      setIsInitializing(false);
    });
  }, []);

  if (isInitializing) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#999', fontSize: 14 }}>Wird geladen…</span>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLogin={setUser} />;
  }

  return <AppShell user={user} onLogout={() => setUser(null)} />;
}
