package com.bikerental.controller;

import com.bikerental.dto.ApiResponse;
import com.bikerental.dto.BikeRequest;
import com.bikerental.model.Bike;
import com.bikerental.service.BikeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bikes")
public class BikeController {

    private final BikeService bikeService;

    public BikeController(BikeService bikeService) {
        this.bikeService = bikeService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Bike>>> getAll(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Boolean available) {
        List<Bike> bikes = bikeService.getAll(type, available);
        return ResponseEntity.ok(ApiResponse.ok(bikes));
    }

    @GetMapping("/admin/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "total", bikeService.countTotal(),
                "available", bikeService.countAvailable(),
                "rented", bikeService.countTotal() - bikeService.countAvailable()
        )));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Bike>> getOne(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(bikeService.getById(id)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Bike>> create(@Valid @RequestBody BikeRequest req) {
        Bike bike = bikeService.create(req);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Bike added to fleet.", bike));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Bike>> update(
            @PathVariable String id,
            @Valid @RequestBody BikeRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("Bike updated.", bikeService.update(id, req)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        bikeService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Bike deleted.", null));
    }

    @PatchMapping("/{id}/avail")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Bike>> setAvailability(
            @PathVariable String id,
            @RequestBody Map<String, Boolean> body) {
        Boolean available = body.get("available");
        if (available == null) throw new IllegalArgumentException("'available' field required.");
        return ResponseEntity.ok(ApiResponse.ok("Availability updated.", bikeService.setAvailability(id, available)));
    }
}
