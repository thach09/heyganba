package com.heyganba.repository;

import com.heyganba.model.entity.Radical;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RadicalRepository extends JpaRepository<Radical, Long> {
    List<Radical> findAllByOrderByStrokeCountAscIdAsc();
}
