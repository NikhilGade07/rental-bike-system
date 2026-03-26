package com.bikerental.controller;

import com.bikerental.dto.ApiResponse;
import com.bikerental.dto.BookingRequest;
import com.bikerental.model.Booking;
import com.bikerental.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Booking>> create(
            @Valid @RequestBody BookingRequest req,
            Principal principal) {
        Booking booking = bookingService.book(principal.getName(), req);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(
                        String.format("Booking confirmed! %s rented for %d %s. Total: $%.2f",
                                booking.getBikeName(), booking.getDuration(),
                                booking.getUnit(), booking.getTotalCost()),
                        booking));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Booking>>> getMyBookings(Principal principal) {
        List<Booking> bookings = bookingService.getByUser(principal.getName());
        return ResponseEntity.ok(ApiResponse.ok(bookings));
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAllBookings() {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.getAllPopulated()));
    }

    @GetMapping("/admin/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAdminStats() {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.getAdminStats()));
    }

    @PatchMapping("/{id}/return")
    public ResponseEntity<ApiResponse<Booking>> returnBike(
            @PathVariable String id,
            Principal principal) {
        Booking booking = bookingService.returnBike(id, principal.getName());
        return ResponseEntity.ok(ApiResponse.ok("Bike returned. Thank you!", booking));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<Booking>> cancel(
            @PathVariable String id,
            Principal principal) {
        Booking booking = bookingService.cancel(id, principal.getName());
        return ResponseEntity.ok(ApiResponse.ok("Booking cancelled.", booking));
    }
}
