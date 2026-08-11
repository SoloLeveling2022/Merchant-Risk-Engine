package com.hasnika.insurance.core.exception;

public class PolicyStateException extends RuntimeException {
    public PolicyStateException(String message) {
        super(message);
    }

    public PolicyStateException(String policyId, String targetStatus, String currentStatus) {
        super(String.format("Invalid policy state transition for policy %s from %s to %s", policyId, currentStatus, targetStatus));
    }
}
