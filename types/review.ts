export interface Review {
    id: string;
    name: string;
    rating: number;
    comment: string;
    date: string;
    image: string;
}

// --- Phase 2: Full review types ---

export interface ReviewAuthor {
    first_name: string | null;
    last_name: string | null;
    image: string | null;
}

export interface ReviewService {
    id: number;
    name: string;
}

export interface ReviewStaff {
    id: number;
    display_name: string;
}

export interface PublicReview {
    id: number;
    rating: number;
    comment: string | null;
    rating_service_quality: number | null;
    rating_staff_attention: number | null;
    rating_punctuality: number | null;
    rating_cleanliness: number | null;
    created_at: string;
    user: ReviewAuthor;
    service: ReviewService | null;
    staff: ReviewStaff | null;
}

export interface CustomerReview extends PublicReview {
    company: {
        id: number;
        name: string;
        slug: string;
    };
}

export interface ReviewSummary {
    average: number;
    count: number;
    distribution: Record<number, number>;
    subRatings: {
        serviceQuality: number | null;
        staffAttention: number | null;
        punctuality: number | null;
        cleanliness: number | null;
    };
}

export interface EligibleBooking {
    id: number;
    company_id: number;
    staff_id: number;
    start_at: string;
    end_at: string;
    status: string;
    company: { id: number; name: string; slug: string };
    staff: { id: number; display_name: string };
    booking_services: Array<{ service: { id: number; name: string } }>;
}

export interface CreateReviewPayload {
    booking_id: number;
    rating: number;
    comment?: string;
    rating_service_quality?: number;
    rating_staff_attention?: number;
    rating_punctuality?: number;
    rating_cleanliness?: number;
}
