package com.hasnika.insurance.identity.exception;

import lombok.Getter;

@Getter
public class ResourceNotFoundException extends RuntimeException {
    private final String resourceName;
    private final String resourceId;

    public ResourceNotFoundException(String resourceName, String resourceId) {
        super(resourceName + " not found with ID: " + resourceId);
        this.resourceName = resourceName;
        this.resourceId = resourceId;
    }
}
