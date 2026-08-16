package com.example.shapeshift.ui.navigation

sealed class Screen(val route: String) {
    data object Dashboard : Screen("dashboard")
    data object RoutineList : Screen("routines")
    data object Journal : Screen("journal")
    data object Profile : Screen("profile")

    data object RoutineDetail : Screen("routines/{routineId}") {
        fun route(routineId: String) = "routines/$routineId"
    }

    data object RoutineFormNew : Screen("routines/new")

    data object RoutineFormEdit : Screen("routines/{routineId}/edit") {
        fun route(routineId: String) = "routines/$routineId/edit"
    }

    data object Workout : Screen("workout/{routineId}") {
        fun route(routineId: String) = "workout/$routineId"
    }
}

val BOTTOM_NAV_ROUTES = listOf(Screen.Dashboard.route, Screen.RoutineList.route, Screen.Journal.route)
