package com.heyganba.repository;

import com.heyganba.model.entity.TtsAudio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/** Truy cập cache audio TTS (xem {@link TtsAudio} + docs/Internal/content-mapping-fpt-curriculum.md). */
@Repository
public interface TtsAudioRepository extends JpaRepository<TtsAudio, Long> {

    Optional<TtsAudio> findByCacheKey(String cacheKey);

    long countByStorageKind(String storageKind);
}
