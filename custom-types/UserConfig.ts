export interface EventMetadata {
  title: "Eavolution Event";
  type: "Event";
  properties: {
    eventName: {
      type: string;
      description: string;
    };
    description: {
      type: string;
      description: string;
    };
    date: {
      type: string;
      description: string;
    };
    venue: {
      type: string;
      description: string;
    };
    organizer: {
      type: string;
      description: string;
    };
    organizerDetails: {
      type: string;
      description: string;
    };
    socialLink: {
      type: string;
      description: string;
    };
    email: {
      type: string;
      description: string;
    };
    phone: {
      type: string;
      description: string;
    };
    image: {
      type: string;
      description: string;
    };
  };
}

export interface TicketMetaData {
  title: "Eavolution Ticket";
  type: "Ticket";
  properties: {
    name: {
      type: string;
      description: string;
    };
    age: {
      type: number;
      description: number;
    };
    address: {
      type: string;
      description: string;
    };
    socialLink: {
      type: string;
      description: string;
    };
    email: {
      type: string;
      description: string;
    };
    phone: {
      type: string;
      description: string;
    };
    adhaar: {
      type: string;
      description: string;
    };
  };
}
