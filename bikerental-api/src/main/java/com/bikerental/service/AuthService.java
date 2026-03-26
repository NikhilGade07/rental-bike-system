package com.bikerental.service;

import com.bikerental.dto.LoginRequest;
import com.bikerental.dto.RegisterRequest;
import com.bikerental.model.User;
import com.bikerental.repository.BookingRepository;
import com.bikerental.repository.UserRepository;
import com.bikerental.security.JwtUtil;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository, BookingRepository bookingRepository,
                       PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.bookingRepository = bookingRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public Map<String, Object> register(RegisterRequest req) {
        if (!req.getPassword().equals(req.getConfirmPassword()))
            throw new IllegalArgumentException("Passwords do not match.");

        if (userRepository.existsByEmail(req.getEmail().toLowerCase().trim()))
            throw new IllegalArgumentException("An account with this email already exists.");

        User user = new User(
                req.getName().trim(),
                req.getEmail().toLowerCase().trim(),
                passwordEncoder.encode(req.getPassword()),
                "user"
        );
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        return buildAuthResponse(user, token);
    }

    public Map<String, Object> login(LoginRequest req) {
        User user = userRepository.findByEmail(req.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password."));

        if (!passwordEncoder.matches(req.getPassword(), user.getPassword()))
            throw new BadCredentialsException("Invalid email or password.");

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        return buildAuthResponse(user, token);
    }

    public Map<String, Object> getProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found."));

        var bookings = bookingRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        long active = bookings.stream().filter(b -> b.getStatus().name().equals("CONFIRMED")).count();
        double spent = bookings.stream()
                .filter(b -> !b.getStatus().name().equals("CANCELLED"))
                .mapToDouble(b -> b.getTotalCost())
                .sum();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalBookings", bookings.size());
        stats.put("activeBookings", active);
        stats.put("totalSpent", Math.round(spent * 100.0) / 100.0);

        Map<String, Object> result = new HashMap<>();
        result.put("user", sanitizeUser(user));
        result.put("stats", stats);
        return result;
    }

    public java.util.List<Map<String, Object>> getAllUsers() {
        return userRepository.findAll().stream().map(this::sanitizeUser).toList();
    }

    private Map<String, Object> sanitizeUser(User user) {
        Map<String, Object> safe = new HashMap<>();
        safe.put("id", user.getId());
        safe.put("name", user.getName());
        safe.put("email", user.getEmail());
        safe.put("role", user.getRole());
        safe.put("createdAt", user.getCreatedAt());
        safe.put("initials", getInitials(user.getName()));
        return safe;
    }

    private Map<String, Object> buildAuthResponse(User user, String token) {
        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("user", sanitizeUser(user));
        return result;
    }

    private String getInitials(String name) {
        if (name == null || name.isBlank()) return "?";
        String[] parts = name.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String p : parts) if (!p.isEmpty()) sb.append(p.charAt(0));
        return sb.toString().toUpperCase().substring(0, Math.min(2, sb.length()));
    }
}
