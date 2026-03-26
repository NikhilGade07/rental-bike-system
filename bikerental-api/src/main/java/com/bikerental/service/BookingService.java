package com.bikerental.service;

import com.bikerental.dto.BookingRequest;
import com.bikerental.model.Bike;
import com.bikerental.model.Booking;
import com.bikerental.model.Booking.BookingStatus;
import com.bikerental.model.User;
import com.bikerental.repository.BikeRepository;
import com.bikerental.repository.BookingRepository;
import com.bikerental.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final BikeRepository bikeRepository;
    private final UserRepository userRepository;

    public BookingService(BookingRepository bookingRepository, BikeRepository bikeRepository, UserRepository userRepository) {
        this.bookingRepository = bookingRepository;
        this.bikeRepository = bikeRepository;
        this.userRepository = userRepository;
    }

    public Booking book(String userEmail, BookingRequest req) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found."));

        Bike bike = bikeRepository.findById(req.getBikeId())
                .orElseThrow(() -> new RuntimeException("Bike not found."));

        if (!bike.isAvailable())
            throw new IllegalStateException("Bike is currently not available.");

        double rate = req.getUnit().equals("days") ? bike.getPricePerHour() * 24 : bike.getPricePerHour();
        double totalCost = Math.round(rate * req.getDuration() * 100.0) / 100.0;

        Booking booking = new Booking(
                user.getId(), bike.getId(), bike.getName(), bike.getEmoji(),
                req.getUnit(), req.getDuration(), totalCost
        );

        bookingRepository.save(booking);

        bike.setAvailable(false);
        bikeRepository.save(bike);

        return booking;
    }

    public Booking returnBike(String bookingId, String userEmail) {
        Booking booking = getBookingAndVerifyOwnership(bookingId, userEmail);

        if (booking.getStatus() != BookingStatus.CONFIRMED)
            throw new IllegalStateException("Booking is not active.");

        booking.setStatus(BookingStatus.RETURNED);
        booking.setReturnedAt(LocalDateTime.now());
        bookingRepository.save(booking);

        bikeRepository.findById(booking.getBikeId()).ifPresent(bike -> {
            bike.setAvailable(true);
            bikeRepository.save(bike);
        });

        return booking;
    }

    public Booking cancel(String bookingId, String userEmail) {
        Booking booking = getBookingAndVerifyOwnership(bookingId, userEmail);

        if (booking.getStatus() == BookingStatus.CANCELLED)
            throw new IllegalStateException("Booking is already cancelled.");

        boolean wasConfirmed = booking.getStatus() == BookingStatus.CONFIRMED;
        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);

        if (wasConfirmed) {
            bikeRepository.findById(booking.getBikeId()).ifPresent(bike -> {
                bike.setAvailable(true);
                bikeRepository.save(bike);
            });
        }

        return booking;
    }

    public List<Booking> getByUser(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found."));
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
    }

    public List<Map<String, Object>> getAllPopulated() {
        return bookingRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(bk -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", bk.getId());
                    map.put("userId", bk.getUserId());
                    map.put("bikeId", bk.getBikeId());
                    map.put("bikeName", bk.getBikeName());
                    map.put("bikeEmoji", bk.getBikeEmoji());
                    map.put("unit", bk.getUnit());
                    map.put("duration", bk.getDuration());
                    map.put("totalCost", bk.getTotalCost());
                    map.put("status", bk.getStatus());
                    map.put("createdAt", bk.getCreatedAt());
                    map.put("returnedAt", bk.getReturnedAt());
                    userRepository.findById(bk.getUserId()).ifPresent(u -> map.put("userName", u.getName()));
                    return map;
                }).toList();
    }

    public Map<String, Object> getAdminStats() {
        long total = bookingRepository.count();
        long active = bookingRepository.countByStatus(BookingStatus.CONFIRMED);
        double revenue = bookingRepository.findAllNonCancelled()
                .stream().mapToDouble(Booking::getTotalCost).sum();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalBookings", total);
        stats.put("activeBookings", active);
        stats.put("revenue", Math.round(revenue * 100.0) / 100.0);
        stats.put("totalBikes", bikeRepository.count());
        stats.put("availableBikes", bikeRepository.countByAvailableTrue());
        stats.put("totalUsers", userRepository.count());
        return stats;
    }

    private Booking getBookingAndVerifyOwnership(String bookingId, String userEmail) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found."));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found."));

        if (!booking.getUserId().equals(user.getId()) && !user.getRole().equals("admin"))
            throw new SecurityException("Access denied.");

        return booking;
    }
}
