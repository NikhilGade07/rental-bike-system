package com.bikerental.repository;

import com.bikerental.model.Booking;
import com.bikerental.model.Booking.BookingStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * BookingRepository – Spring Data MongoDB
 */
@Repository
public interface BookingRepository extends MongoRepository<Booking, String> {

    /** All bookings for a specific user, newest first */
    List<Booking> findByUserIdOrderByCreatedAtDesc(String userId);

    /** All bookings for a specific bike */
    List<Booking> findByBikeId(String bikeId);

    /** All bookings by status */
    List<Booking> findByStatus(BookingStatus status);

    /** Count active (confirmed) bookings */
    long countByStatus(BookingStatus status);

    /** Sum total revenue (non-cancelled) using @Query aggregation helper */
    @Query(value = "{ 'status': { $ne: 'CANCELLED' } }", fields = "{ 'totalCost': 1 }")
    List<Booking> findAllNonCancelled();
}
