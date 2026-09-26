package com.heyganba.repository;

import com.heyganba.model.entity.Kana;
import com.heyganba.model.enums.KanaGroup;
import com.heyganba.model.enums.KanaType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KanaRepository extends JpaRepository<Kana, Long> {
    List<Kana> findByKanaType(KanaType kanaType);
    List<Kana> findByKanaGroup(KanaGroup kanaGroup);
    List<Kana> findByKanaTypeAndKanaGroup(KanaType kanaType, KanaGroup kanaGroup);
}
