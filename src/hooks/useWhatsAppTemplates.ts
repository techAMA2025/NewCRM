import { useState, useEffect } from 'react'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/firebase/firebase'

export type WhatsAppRole = 'advocate' | 'sales' | 'overlord'

interface WhatsAppTemplate {
  id: string
  name: string
  templateName: string
  description: string
  type: WhatsAppRole | WhatsAppRole[]
  isActive: boolean
  createdAt: any
  updatedAt: any
}

interface UseWhatsAppTemplatesReturn {
  templates: WhatsAppTemplate[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useWhatsAppTemplates = (type?: WhatsAppRole): UseWhatsAppTemplatesReturn => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const templatesRef = collection(db, 'whatsappTemplates')
      
      // Simplify query to avoid composite index requirements
      // We fetch all active templates and filter/sort client-side
      const q = query(
        templatesRef, 
        where('isActive', '==', true)
      )
      
      const snapshot = await getDocs(q)
      
      const templatesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WhatsAppTemplate[]
      
      // Filter by type if provided, handling both string and array formats
      // Also ensure type matches are case-insensitive just in case
      let filtered = type 
        ? templatesData.filter(t => {
            if (!t.type) return false
            const templateTypes = Array.isArray(t.type) 
              ? t.type 
              : [t.type]
            
            return templateTypes.some(role => 
              role && role.toString().toLowerCase() === type.toLowerCase()
            )
          })
        : templatesData
      
      // Sort client-side by name
      filtered = filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      
      setTemplates(filtered)
    } catch (err) {
      console.error('Error fetching templates:', err)
      setError('Failed to fetch templates')
      // Fallback to default templates if Firebase fails
      setTemplates(getDefaultTemplates(type))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [type])

  const refetch = async () => {
    await fetchTemplates()
  }

  return { templates, loading, error, refetch }
}

// Fallback default templates
const getDefaultTemplates = (type?: WhatsAppRole): WhatsAppTemplate[] => {
  const salesTemplates: WhatsAppTemplate[] = [
    {
      id: 'default-1',
      name: "CIBIL",
      templateName: "ama_dashboard_credit_report",
      description: "Send CIBIL credit report information",
      type: ['sales'],
      isActive: true,
      createdAt: null,
      updatedAt: null
    },
    {
      id: 'default-2',
      name: "Answered Call",
      templateName: "ama_dashboard_after_call",
      description: "Follow-up after answered call",
      type: ['sales'],
      isActive: true,
      createdAt: null,
      updatedAt: null
    },
    {
      id: 'default-3',
      name: "Loan Settlement?",
      templateName: "ama_dashboard_loan_settlement1",
      description: "Ask about loan settlement",
      type: ['sales'],
      isActive: true,
      createdAt: null,
      updatedAt: null
    },
    {
      id: 'default-4',
      name: "No Answer",
      templateName: "ama_dashboard_no_answer",
      description: "Follow-up for unanswered calls",
      type: ['sales'],
      isActive: true,
      createdAt: null,
      updatedAt: null
    },
    {
      id: 'default-5',
      name: "What we do?",
      templateName: "ama_dashboard_struggling1",
      description: "Explain what AMA Legal Solutions does",
      type: ['sales'],
      isActive: true,
      createdAt: null,
      updatedAt: null
    }
  ]

  const advocateTemplates: WhatsAppTemplate[] = [
    {
      id: 'default-advocate-1',
      name: "Send Feedback Message",
      templateName: "advocate_feedback_20250801",
      description: "Send feedback request message to client",
      type: ['advocate'],
      isActive: true,
      createdAt: null,
      updatedAt: null
    }
  ]

  const overlordTemplates: WhatsAppTemplate[] = []

  if (type === 'sales') return salesTemplates
  if (type === 'advocate') return advocateTemplates
  if (type === 'overlord') return overlordTemplates
  return [...salesTemplates, ...advocateTemplates, ...overlordTemplates]
}

 