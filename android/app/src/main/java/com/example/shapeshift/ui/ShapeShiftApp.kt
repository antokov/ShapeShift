package com.example.shapeshift.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.shapeshift.data.model.Routine
import com.example.shapeshift.data.network.SessionHolder
import com.example.shapeshift.ui.dashboard.DashboardScreen
import com.example.shapeshift.ui.journal.JournalScreen
import com.example.shapeshift.ui.login.LoginScreen
import com.example.shapeshift.ui.navigation.BOTTOM_NAV_ROUTES
import com.example.shapeshift.ui.navigation.Screen
import com.example.shapeshift.ui.profile.ProfileScreen
import com.example.shapeshift.ui.routines.detail.RoutineDetailScreen
import com.example.shapeshift.ui.routines.form.RoutineFormScreen
import com.example.shapeshift.ui.routines.list.RoutineListScreen
import com.example.shapeshift.ui.theme.Indigo
import com.example.shapeshift.ui.theme.PageBackground
import com.example.shapeshift.ui.theme.SidebarBackground
import com.example.shapeshift.ui.theme.Surface
import com.example.shapeshift.ui.theme.TextMuted
import com.example.shapeshift.ui.workout.WorkoutSessionScreen
import kotlinx.coroutines.launch

@Composable
fun ShapeShiftApp() {
    val container = rememberAppContainer()
    var isInitializing by remember { mutableStateOf(true) }
    var currentUser by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        container.authManager.initAuth()
        val user = container.authManager.getCurrentUser()
        if (user != null) SessionHolder.username.value = user
        currentUser = user
        isInitializing = false
    }

    when {
        isInitializing -> Box(Modifier.fillMaxSize().background(PageBackground), contentAlignment = Alignment.Center) {
            Text("Wird geladen…", color = TextMuted)
        }
        currentUser == null -> LoginScreen(onLoginSuccess = { user -> currentUser = user })
        else -> AppScaffold(
            username = currentUser!!,
            onLogout = {
                scope.launch { container.authManager.logout() }
                currentUser = null
            },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class, androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
private fun AppScaffold(username: String, onLogout: () -> Unit) {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val showBottomBar = currentRoute in BOTTOM_NAV_ROUTES
    val container = rememberAppContainer()
    val routines by container.routineRepository.routines.collectAsState()

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("ShapeShift · $username") },
                actions = {
                    IconButton(onClick = { navController.navigate(Screen.Profile.route) }) {
                        Icon(Icons.Filled.AccountCircle, contentDescription = "Profil")
                    }
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Filled.Logout, contentDescription = "Logout")
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Surface),
            )
        },
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(containerColor = SidebarBackground) {
                    val items = listOf(
                        Triple(Screen.Dashboard.route, "Dashboard", Icons.Filled.Home),
                        Triple(Screen.RoutineList.route, "Routinen", Icons.Filled.FitnessCenter),
                        Triple(Screen.Journal.route, "Journal", Icons.Filled.CalendarMonth),
                    )
                    items.forEach { (route, label, icon) ->
                        NavigationBarItem(
                            selected = currentRoute == route,
                            onClick = {
                                navController.navigate(route) {
                                    popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(icon, contentDescription = label) },
                            label = { Text(label) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = Surface,
                                selectedTextColor = Surface,
                                unselectedIconColor = TextMuted,
                                unselectedTextColor = TextMuted,
                                indicatorColor = Indigo,
                            ),
                        )
                    }
                }
            }
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            NavHost(
                navController = navController,
                startDestination = Screen.Dashboard.route,
            ) {
                composable(Screen.Dashboard.route) { DashboardScreen() }

                composable(Screen.RoutineList.route) {
                    RoutineListScreen(
                        onNew = { navController.navigate(Screen.RoutineFormNew.route) },
                        onView = { id -> navController.navigate(Screen.RoutineDetail.route(id)) },
                        onEdit = { id -> navController.navigate(Screen.RoutineFormEdit.route(id)) },
                    )
                }

                composable(Screen.Journal.route) { JournalScreen() }

                composable(Screen.Profile.route) { ProfileScreen() }

                composable(
                    Screen.RoutineDetail.route,
                    arguments = listOf(navArgument("routineId") { type = NavType.StringType }),
                ) { entry ->
                    val id = entry.arguments?.getString("routineId") ?: return@composable
                    RoutineDetailScreen(
                        routineId = id,
                        onBack = { navController.popBackStack() },
                        onEdit = { navController.navigate(Screen.RoutineFormEdit.route(id)) },
                        onStartWorkout = { navController.navigate(Screen.Workout.route(id)) },
                    )
                }

                composable(Screen.RoutineFormNew.route) {
                    RoutineFormScreen(
                        existing = null,
                        onSaved = { navController.popBackStack(Screen.RoutineList.route, false) },
                        onCancel = { navController.popBackStack() },
                    )
                }

                composable(
                    Screen.RoutineFormEdit.route,
                    arguments = listOf(navArgument("routineId") { type = NavType.StringType }),
                ) { entry ->
                    val id = entry.arguments?.getString("routineId") ?: return@composable
                    val existing: Routine? = routines.find { it.id == id }
                    RoutineFormScreen(
                        existing = existing,
                        onSaved = { navController.popBackStack(Screen.RoutineList.route, false) },
                        onCancel = { navController.popBackStack() },
                    )
                }

                composable(
                    Screen.Workout.route,
                    arguments = listOf(navArgument("routineId") { type = NavType.StringType }),
                ) { entry ->
                    val id = entry.arguments?.getString("routineId") ?: return@composable
                    val routine: Routine? = routines.find { it.id == id }
                    if (routine != null) {
                        WorkoutSessionScreen(
                            routine = routine,
                            onFinish = {
                                navController.navigate(Screen.Dashboard.route) {
                                    popUpTo(navController.graph.findStartDestination().id) { inclusive = false }
                                }
                            },
                            onAbort = { navController.popBackStack() },
                        )
                    }
                }
            }
        }
    }
}
