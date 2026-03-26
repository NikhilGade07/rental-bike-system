package com.bikerental.repository;

import com.bikerental.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * UserRepository – Spring Data MongoDB
 * Equivalent to Mongoose: User.findOne({ email }) → findByEmail()
 */
@Repository
public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
}
