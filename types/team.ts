export interface TeamMember {
    id: string;
    name: string;
    position: string;
    image: string;
}

export interface Team {
    members: TeamMember[];
}
