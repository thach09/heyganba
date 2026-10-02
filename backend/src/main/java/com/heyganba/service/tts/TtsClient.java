package com.heyganba.service.tts;

/** Sinh audio cho 1 chuỗi KANA (interface để test thay được client thật). */
public interface TtsClient {

    /**
     * @param kanaText chuỗi KANA đúng ngữ cảnh (KHÔNG truyền kanji thô — xem GoogleTranslateTtsClient)
     * @return nội dung file mp3
     */
    byte[] synthesize(String kanaText);
}
