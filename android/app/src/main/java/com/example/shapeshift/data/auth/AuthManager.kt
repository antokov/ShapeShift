package com.example.shapeshift.data.auth

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.example.shapeshift.data.network.SessionHolder
import kotlinx.coroutines.flow.first
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.security.MessageDigest
import java.security.SecureRandom

@Serializable
private data class UserRecord(
    val username: String,
    val passwordHash: String,
    val salt: String,
    val createdAt: String,
)

data class UserInfo(val username: String, val createdAt: String)

private val Context.authDataStore by preferencesDataStore(name = "auth")

/**
 * Local, device-side auth store — a Kotlin port of src/hooks/useAuth.js.
 * There is no auth API on the backend; the web app keeps users in
 * localStorage and only sends the active username via the `X-User-Id`
 * header so the backend can partition data per user. This mirrors that:
 * users + session live in DataStore on-device, hashed the same way
 * (SHA-256 of salt+password), and SessionHolder.username is what actually
 * drives backend data isolation.
 */
class AuthManager(private val context: Context) {

    private val json = Json { ignoreUnknownKeys = true }
    private val usersKey = stringPreferencesKey("users_json")
    private val sessionKey = stringPreferencesKey("session_username")

    private suspend fun loadUsers(): List<UserRecord> {
        val raw = context.authDataStore.data.first()[usersKey] ?: return emptyList()
        return try {
            json.decodeFromString(raw)
        } catch (e: Exception) {
            emptyList()
        }
    }

    private suspend fun saveUsers(users: List<UserRecord>) {
        context.authDataStore.edit { it[usersKey] = json.encodeToString(users) }
    }

    private fun generateSalt(): String {
        val bytes = ByteArray(16)
        SecureRandom().nextBytes(bytes)
        return bytes.joinToString("") { "%02x".format(it) }
    }

    private fun hashPassword(password: String, salt: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val bytes = digest.digest((salt + password).toByteArray(Charsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }

    suspend fun initAuth() {
        val users = loadUsers()
        if (users.isEmpty()) {
            val salt = generateSalt()
            val hash = hashPassword("admin123", salt)
            saveUsers(
                listOf(
                    UserRecord(
                        username = "admin",
                        passwordHash = hash,
                        salt = salt,
                        createdAt = java.time.Instant.now().toString(),
                    )
                )
            )
        }
    }

    suspend fun login(username: String, password: String): Result<String> {
        val users = loadUsers()
        val user = users.find { it.username == username }
            ?: return Result.failure(Exception("Benutzername nicht gefunden"))
        val hash = hashPassword(password, user.salt)
        if (hash != user.passwordHash) {
            return Result.failure(Exception("Falsches Passwort"))
        }
        context.authDataStore.edit { it[sessionKey] = username }
        SessionHolder.username.value = username
        return Result.success(username)
    }

    suspend fun logout() {
        context.authDataStore.edit { it.remove(sessionKey) }
        SessionHolder.username.value = "admin"
    }

    suspend fun getCurrentUser(): String? {
        val username = context.authDataStore.data.first()[sessionKey] ?: return null
        val users = loadUsers()
        return if (users.any { it.username == username }) username else null
    }

    suspend fun createUser(username: String, password: String): Result<UserInfo> {
        val trimmed = username.trim()
        if (trimmed.length < 2) return Result.failure(Exception("Benutzername muss mindestens 2 Zeichen haben"))
        if (!Regex("^[a-zA-Z0-9_-]+$").matches(trimmed)) {
            return Result.failure(Exception("Benutzername darf nur Buchstaben, Ziffern, - und _ enthalten"))
        }
        if (password.length < 4) return Result.failure(Exception("Passwort muss mindestens 4 Zeichen haben"))

        val users = loadUsers()
        if (users.any { it.username == trimmed }) {
            return Result.failure(Exception("Benutzername bereits vergeben"))
        }
        val salt = generateSalt()
        val hash = hashPassword(password, salt)
        val createdAt = java.time.Instant.now().toString()
        saveUsers(users + UserRecord(trimmed, hash, salt, createdAt))
        return Result.success(UserInfo(trimmed, createdAt))
    }

    suspend fun getUsers(): List<UserInfo> =
        loadUsers().map { UserInfo(it.username, it.createdAt) }

    suspend fun deleteUser(username: String): Result<Unit> {
        if (username == "admin") return Result.failure(Exception("Der Admin-Benutzer kann nicht gelöscht werden"))
        val users = loadUsers()
        if (users.none { it.username == username }) return Result.failure(Exception("Benutzer nicht gefunden"))
        saveUsers(users.filterNot { it.username == username })
        return Result.success(Unit)
    }
}
