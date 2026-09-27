package com.heyganba.repository;

import com.heyganba.model.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    /** Lọc user theo mã lớp (so khớp không phân biệt hoa thường) — dùng cho leaderboard theo lớp. */
    List<User> findByClassCodeIgnoreCase(String classCode);
}
