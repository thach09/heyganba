package com.heyganba.service.srs;

import com.heyganba.dto.flashcard.FlashcardDueResponse;

import java.util.List;
import java.util.Optional;

/**
 * Cache danh sách "từ cần ôn hôm nay" theo user (task 2.4).
 *
 * Hiện dùng implementation in-memory ({@link InMemorySrsDueCache}) vì phase 2 chưa thêm Redis
 * (không thêm dependency ngoài phạm vi phase). Khi bật Redis managed ở staging/production chỉ cần
 * implement lại interface này (key `srs:due:{userId}`, TTL hết ngày), không đổi service/controller.
 */
public interface SrsDueCache {

    Optional<List<FlashcardDueResponse>> get(Long userId);

    void put(Long userId, List<FlashcardDueResponse> items);

    void invalidate(Long userId);

    /** Xoá toàn bộ cache — dùng bởi job đồng bộ lúc 00:05 (task 2.5). */
    void clearAll();
}
