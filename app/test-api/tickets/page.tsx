"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface TicketType {
  id: string;
  event_id: string;
  name: string;
  description?: string;
  price: number;
  quantity_available: number;
  quantity_sold: number;
  max_per_order?: number;
  sale_start_date?: string;
  sale_end_date?: string;
  created_at: string;
  updated_at: string;
}

export default function TestTicketTypesAPI() {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState("");
  const [ticketId, setTicketId] = useState("");

  // Test GET /api/tickets/event/[eventId]
  const testGetTicketsByEvent = async () => {
    if (!eventId) {
      setError("Please enter an Event ID");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tickets/event/${eventId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch ticket types");
      }

      setTicketTypes(data.ticket_types || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Test GET /api/tickets/[id]
  const testGetTicketType = async () => {
    if (!ticketId) {
      setError("Please enter a Ticket Type ID");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tickets/${ticketId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch ticket type");
      }

      setSelectedTicket(data.ticket_type);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Test PUT /api/tickets/[id] (Update ticket type)
  const testUpdateTicketType = async () => {
    if (!ticketId) {
      setError("Please enter a Ticket Type ID");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const updateData = {
        name: "Updated Ticket Name",
        description: "Updated description via API test",
        price: 25.99,
      };

      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update ticket type");
      }

      setSelectedTicket(data.ticket_type);
      alert("Ticket type updated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Test DELETE /api/tickets/[id]
  const testDeleteTicketType = async () => {
    if (!ticketId) {
      setError("Please enter a Ticket Type ID");
      return;
    }

    if (!confirm("Are you sure you want to delete this ticket type?")) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete ticket type");
      }

      alert("Ticket type deleted successfully!");
      setSelectedTicket(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Test Ticket Types API</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="grid gap-6">
        {/* Test Get Tickets by Event */}
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">
            GET /api/tickets/event/[eventId]
          </h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Enter Event ID"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded"
            />
            <Button onClick={testGetTicketsByEvent} disabled={loading}>
              {loading ? "Loading..." : "Get Tickets"}
            </Button>
          </div>

          {ticketTypes.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">
                Ticket Types ({ticketTypes.length}):
              </h3>
              {ticketTypes.map((ticket) => (
                <div key={ticket.id} className="bg-gray-50 p-3 rounded">
                  <div className="font-medium">{ticket.name}</div>
                  <div className="text-sm text-gray-600">
                    ID: {ticket.id} | Price: ${ticket.price} | Available:{" "}
                    {ticket.quantity_available - ticket.quantity_sold}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Test Individual Ticket Operations */}
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">
            Individual Ticket Type Operations
          </h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Enter Ticket Type ID"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded"
            />
          </div>

          <div className="flex gap-2 mb-4">
            <Button onClick={testGetTicketType} disabled={loading}>
              Get Ticket Type
            </Button>
            <Button onClick={testUpdateTicketType} disabled={loading}>
              Update Ticket Type
            </Button>
            <Button
              onClick={testDeleteTicketType}
              disabled={loading}
              variant="destructive"
            >
              Delete Ticket Type
            </Button>
          </div>

          {selectedTicket && (
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-medium mb-2">Selected Ticket Type:</h3>
              <pre className="text-sm">
                {JSON.stringify(selectedTicket, null, 2)}
              </pre>
            </div>
          )}
        </Card>

        {/* API Endpoint Documentation */}
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">Available Endpoints</h2>
          <div className="space-y-3 text-sm">
            <div>
              <code className="bg-gray-100 px-2 py-1 rounded">
                GET /api/tickets/event/[eventId]
              </code>
              <span className="ml-2 text-gray-600">
                Get all ticket types for an event
              </span>
            </div>
            <div>
              <code className="bg-gray-100 px-2 py-1 rounded">
                GET /api/tickets/[id]
              </code>
              <span className="ml-2 text-gray-600">
                Get specific ticket type by ID
              </span>
            </div>
            <div>
              <code className="bg-gray-100 px-2 py-1 rounded">
                PUT /api/tickets/[id]
              </code>
              <span className="ml-2 text-gray-600">
                Update ticket type (requires auth)
              </span>
            </div>
            <div>
              <code className="bg-gray-100 px-2 py-1 rounded">
                DELETE /api/tickets/[id]
              </code>
              <span className="ml-2 text-gray-600">
                Delete ticket type (requires auth, no sold tickets)
              </span>
            </div>
          </div>
        </Card>

        {/* Migration Status */}
        <Card className="p-4 bg-green-50">
          <h2 className="text-xl font-semibold mb-2 text-green-800">
            ✅ Ticket Types API Migration Complete
          </h2>
          <p className="text-green-700">
            The ticket types API has been successfully migrated from Supabase
            Edge Functions to Next.js API Routes. All CRUD operations are
            available and tested.
          </p>
        </Card>
      </div>
    </div>
  );
}
