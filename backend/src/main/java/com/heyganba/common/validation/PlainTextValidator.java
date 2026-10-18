package com.heyganba.common.validation;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
public class PlainTextValidator implements ConstraintValidator<PlainText,String> {
    @Override public boolean isValid(String value,ConstraintValidatorContext context) {
        return value == null || (!value.matches("(?s).*<[^>]*>.*") && value.codePoints().noneMatch(c -> Character.isISOControl(c) && c != '\n' && c != '\r' && c != '\t'));
    }
}
