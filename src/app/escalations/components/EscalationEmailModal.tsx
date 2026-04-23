'use client'

import React, { useState, useEffect } from 'react'
import { db } from '@/firebase/firebase'
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useAuth } from '@/context/AuthContext'
import { authFetch } from '@/lib/authFetch'
import { toast } from 'react-hot-toast'
import { FaPaperPlane, FaEnvelope, FaEdit, FaHistory, FaChevronDown, FaChevronUp } from 'react-icons/fa'

interface EmailRecord {
  id: string
  subject: string
  body: string
  recipientEmail: string
  draftType: string
  sentBy: string
  sentAt: any
}

interface EscalationEmailModalProps {
  isOpen: boolean
  onClose: () => void
  escalation: {
    id: string
    clientName: string
    email: string
    concern: string
  } | null
  isDarkMode: boolean
}

const DRAFT_TEMPLATES = [
  {
    id: 'in_progress',
    label: '🔄 Escalation In Progress',
    color: 'amber',
    getSubject: (name: string) => `Your Escalation is Being Addressed — AMA Legal Solutions`,
    getBody: (name: string, concern: string) =>
`Dear ${name},

Greetings from AMA Legal Solutions!

We are writing to inform you that your escalation regarding your concern has been received and is currently being addressed by our dedicated team.

We want to assure you that your concern is our top priority. Our team is actively working on resolving this matter, and we expect it to be resolved within 24 to 48 hours.

We understand your time is valuable, and we appreciate your patience as we work diligently to provide you with a satisfactory resolution.

If you have any additional information or questions in the meantime, please do not hesitate to reach out to us.

Warm regards,
Team AMA Legal Solutions
📧 escalations@amalegalsolutions.com
🌐 www.amalegalsolutions.com`,
  },
  {
    id: 'resolved',
    label: '✅ Escalation Closed',
    color: 'green',
    getSubject: (name: string) => `Your Escalation Has Been Resolved — AMA Legal Solutions`,
    getBody: (name: string, concern: string) =>
`Dear ${name},

Greetings from AMA Legal Solutions!

We are pleased to inform you that your escalation regarding your concern has been successfully resolved and is now closed.

We sincerely hope that we were able to address your concerns satisfactorily and meet your expectations. Your trust in AMA Legal Solutions means the world to us, and we are committed to providing you with the best possible service.

If you feel that any aspect of your concern has not been fully addressed, or if you have any further queries, please do not hesitate to contact us. We are always here to help.

Thank you for your patience and understanding throughout this process.

Warm regards,
Team AMA Legal Solutions
📧 escalations@amalegalsolutions.com
🌐 www.amalegalsolutions.com`,
  },
  {
    id: 'acknowledged',
    label: '📩 Escalation Acknowledged',
    color: 'blue',
    getSubject: (name: string) => `We Have Received Your Escalation — AMA Legal Solutions`,
    getBody: (name: string, concern: string) =>
`Dear ${name},

Greetings from AMA Legal Solutions!

This is to acknowledge that we have received your escalation regarding your concern. Your concern has been logged and assigned to the appropriate team for immediate review.

We take every escalation very seriously and want to assure you that this matter will be handled with the utmost priority. You will receive regular updates on the progress of your case.

Our team will be in touch with you shortly to discuss the next steps and gather any additional details if needed.

Thank you for bringing this to our attention. We value your association with AMA Legal Solutions.

Warm regards,
Team AMA Legal Solutions
📧 escalations@amalegalsolutions.com
🌐 www.amalegalsolutions.com`,
  },
]

function textToHtml(text: string, clientName: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  const paragraphs = escaped.split('\n\n').map(p => {
    const lines = p.split('\n').join('<br/>')
    return `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">${lines}</p>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:620px;margin:20px auto;padding:24px;">
    ${paragraphs}
  </div>
</body>
</html>`
}

const colorMap: Record<string, { bg: string; border: string; text: string; hover: string; darkBg: string; darkBorder: string; darkText: string }> = {
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', hover: 'hover:bg-amber-100', darkBg: 'bg-amber-500/10', darkBorder: 'border-amber-500/20', darkText: 'text-amber-400' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', hover: 'hover:bg-green-100', darkBg: 'bg-green-500/10', darkBorder: 'border-green-500/20', darkText: 'text-green-400' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', hover: 'hover:bg-blue-100', darkBg: 'bg-blue-500/10', darkBorder: 'border-blue-500/20', darkText: 'text-blue-400' },
}

export default function EscalationEmailModal({ isOpen, onClose, escalation, isDarkMode }: EscalationEmailModalProps) {
  const { userName } = useAuth()
  const [selectedDraft, setSelectedDraft] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [emailHistory, setEmailHistory] = useState<EmailRecord[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Fetch email history when modal opens
  useEffect(() => {
    if (escalation && isOpen) {
      setRecipientEmail(escalation.email)
      setSelectedDraft(null)
      setSubject('')
      setBody('')
      fetchEmailHistory(escalation.id)
    }
  }, [escalation, isOpen])

  const fetchEmailHistory = async (escalationId: string) => {
    setLoadingHistory(true)
    try {
      const historyRef = collection(db, 'escalations', escalationId, 'emailHistory')
      const q = query(historyRef, orderBy('sentAt', 'desc'))
      const snapshot = await getDocs(q)
      const records: EmailRecord[] = []
      snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as EmailRecord)
      })
      setEmailHistory(records)
    } catch (err) {
      console.error('Failed to fetch email history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleSelectDraft = (draftId: string) => {
    if (!escalation) return
    const draft = DRAFT_TEMPLATES.find(d => d.id === draftId)
    if (!draft) return
    setSelectedDraft(draftId)
    setSubject(draft.getSubject(escalation.clientName))
    setBody(draft.getBody(escalation.clientName, escalation.concern))
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp.seconds * 1000)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const handleSend = async () => {
    if (!escalation || !subject.trim() || !body.trim() || !recipientEmail.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    setSending(true)
    try {
      const htmlBody = textToHtml(body, escalation.clientName)
      const res = await authFetch('/api/escalations/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: escalation.clientName,
          clientEmail: recipientEmail,
          subject,
          htmlBody,
          escalationId: escalation.id,
        }),
      })

      const data = await res.json()
      if (data.success) {
        // Save to Firestore email history
        const draftLabel = DRAFT_TEMPLATES.find(d => d.id === selectedDraft)?.label || 'Custom'
        await addDoc(collection(db, 'escalations', escalation.id, 'emailHistory'), {
          subject: subject.trim(),
          body: body.trim(),
          recipientEmail: recipientEmail.trim(),
          draftType: draftLabel,
          sentBy: userName || 'Unknown',
          sentAt: serverTimestamp(),
        })

        toast.success(`Email sent to ${recipientEmail}`)
        onClose()
      } else {
        toast.error(data.message || data.error || 'Failed to send email')
      }
    } catch (err: any) {
      console.error('Send email error:', err)
      toast.error(err.message || 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  if (!escalation) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white text-gray-900'}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FaEnvelope className="text-indigo-500" />
            Send Escalation Email
          </DialogTitle>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            To: <strong>{escalation.clientName}</strong> ({escalation.email})
          </p>
        </DialogHeader>

        {/* Draft Selector */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Select a Draft Template</Label>
          <div className="grid grid-cols-1 gap-2">
            {DRAFT_TEMPLATES.map((draft) => {
              const c = colorMap[draft.color]
              const isSelected = selectedDraft === draft.id
              return (
                <button
                  key={draft.id}
                  onClick={() => handleSelectDraft(draft.id)}
                  className={`text-left px-4 py-3 rounded-lg border-2 transition-all text-sm font-semibold ${
                    isDarkMode
                      ? `${c.darkBg} ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500/50' : c.darkBorder} ${c.darkText} hover:border-indigo-400`
                      : `${c.bg} ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500/30' : c.border} ${c.text} ${c.hover}`
                  }`}
                >
                  {draft.label}
                </button>
              )
            })}
          </div>
        </div>

        {selectedDraft && (
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Recipient Email</Label>
              <Input
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="client@example.com"
                className={isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white text-black border-gray-300'}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider opacity-70">
                <FaEdit className="inline mr-1" /> Subject (editable)
              </Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white text-black border-gray-300'}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider opacity-70">
                <FaEdit className="inline mr-1" /> Email Body (editable)
              </Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                className={`text-sm resize-y ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white text-black border-gray-300'}`}
              />
            </div>
          </div>
        )}

        {/* Email History Section */}
        <div className="mt-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors w-full py-2 px-3 rounded-lg ${
              isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <FaHistory size={10} />
            Email History ({emailHistory.length})
            {showHistory ? <FaChevronUp size={10} className="ml-auto" /> : <FaChevronDown size={10} className="ml-auto" />}
          </button>

          {showHistory && (
            <div className={`mt-2 max-h-48 overflow-y-auto rounded-lg border ${
              isDarkMode ? 'border-gray-800 bg-gray-950/50' : 'border-gray-200 bg-gray-50'
            }`}>
              {loadingHistory ? (
                <p className="p-4 text-center text-xs text-gray-500">Loading...</p>
              ) : emailHistory.length === 0 ? (
                <p className="p-4 text-center text-xs text-gray-500">No emails sent yet.</p>
              ) : (
                emailHistory.map((record) => (
                  <div
                    key={record.id}
                    className={`px-3 py-2.5 border-b last:border-b-0 ${
                      isDarkMode ? 'border-gray-800' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {record.subject}
                        </p>
                        <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          To: {record.recipientEmail} · {record.draftType}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {formatDate(record.sentAt)}
                        </p>
                        <p className={`text-[9px] font-semibold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                          by {record.sentBy}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className={isDarkMode ? 'border-gray-700 hover:bg-gray-800' : ''}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!selectedDraft || sending || !subject.trim() || !body.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
          >
            {sending ? (
              <span className="flex items-center gap-2">Sending...</span>
            ) : (
              <span className="flex items-center gap-2"><FaPaperPlane className="h-3 w-3" /> Send Email</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
