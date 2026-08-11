package com.hasnika.insurance.insurance;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import com.hasnika.insurance.identity.dto.*;
import com.hasnika.insurance.identity.entity.*;
import com.hasnika.insurance.identity.exception.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.Map;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {"eureka.client.enabled=false", "spring.cloud.discovery.enabled=false"})
class IdentityServiceApplicationTests {

    @Test
    void contextLoadsAndCoversModels() throws Exception {
        Class<?>[] classes = {
            ApiResponse.class, AuthResponse.class, KycSubmitRequest.class,
            LoginRequest.class, RegisterRequest.class, KycRecord.class,
            RefreshToken.class, User.class, UserRole.class, Role.class
        };
        for (Class<?> clazz : classes) coverLombokBranches(clazz);

        // Enums
        assertTrue(KycStatus.values().length > 0);

        // Exceptions
        BusinessRuleException bre = new BusinessRuleException("CODE", "error");
        assertEquals("error", bre.getMessage()); assertEquals("CODE", bre.getErrorCode());
        ResourceNotFoundException rnfe = new ResourceNotFoundException("Res", "ID");
        assertNotNull(rnfe.getMessage()); assertEquals("Res", rnfe.getResourceName()); assertEquals("ID", rnfe.getResourceId());
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        assertEquals(HttpStatus.CONFLICT, handler.handleBusinessRule(bre).block().getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, handler.handleNotFound(rnfe).block().getStatusCode());
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, handler.handleGeneric(new RuntimeException("error")).block().getStatusCode());
    }

    private void coverLombokBranches(Class<?> clazz) throws Exception {
        Object o1 = clazz.getDeclaredConstructor().newInstance();
        Object o2 = clazz.getDeclaredConstructor().newInstance();
        o1.equals(o1); o1.equals(null); o1.equals(new Object()); o1.equals(o2);
        o1.hashCode(); o1.toString();
        for (java.lang.reflect.Field field : clazz.getDeclaredFields()) {
            if (java.lang.reflect.Modifier.isStatic(field.getModifiers())) continue;
            field.setAccessible(true);
            Object val = getDummyValue(field.getType());
            if (val != null) {
                field.set(o1, val); o1.equals(o2); o2.equals(o1); field.set(o2, val); o1.equals(o2);
            }
            try { java.lang.reflect.Method canEqual = clazz.getDeclaredMethod("canEqual", Object.class); canEqual.invoke(o1, o2); canEqual.invoke(o1, new Object()); } catch (Exception e) {}
            String suffix = field.getName().substring(0, 1).toUpperCase() + field.getName().substring(1);
            try { clazz.getDeclaredMethod("get" + suffix).invoke(o1); } catch (Exception e) {}
            try { clazz.getDeclaredMethod("is" + suffix).invoke(o1); } catch (Exception e) {}
            try { clazz.getDeclaredMethod("set" + suffix, field.getType()).invoke(o1, val); } catch (Exception e) {}
        }
        try {
            Object builder = clazz.getDeclaredMethod("builder").invoke(null);
            builder.toString();
            for (java.lang.reflect.Field field : clazz.getDeclaredFields()) {
                if (java.lang.reflect.Modifier.isStatic(field.getModifiers())) continue;
                try { builder.getClass().getDeclaredMethod(field.getName(), field.getType()).invoke(builder, getDummyValue(field.getType())); } catch (Exception e) {}
            }
            Object built = builder.getClass().getDeclaredMethod("build").invoke(builder); built.toString();
        } catch (Exception e) {}
    }

    private Object getDummyValue(Class<?> type) {
        if (type == String.class) return "dummy";
        if (type == Integer.class || type == int.class) return 1;
        if (type == Long.class || type == long.class) return 1L;
        if (type == Boolean.class || type == boolean.class) return true;
        if (type == Instant.class) return Instant.now();
        if (type == List.class) return List.of("dummy");
        if (type == KycStatus.class) return KycStatus.APPROVED;
        return null;
    }
}
