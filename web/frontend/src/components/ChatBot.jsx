import React, { useState, useRef, useEffect } from 'react'
import logoWeb from '../logo_web.png'
import '../styles/shared/chatbot.css'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''

const SYSTEM_PROMPT = `Bạn là ULSA Bot - trợ lý AI thông minh toàn diện, được tích hợp vào hệ thống ULSA Green Credit. Bạn được xây dựng trên nền tảng Gemini AI của Google, có khả năng trả lời mọi câu hỏi về bất kỳ chủ đề nào.

## VAI TRÒ CHÍNH
Bạn là chuyên gia về hệ thống ULSA Green Credit, đồng thời là trợ lý thông minh tổng hợp. Bạn có thể:
- Trả lời câu hỏi về hệ thống tín chỉ xanh UGC, claims, blockchain, ưu đãi, điểm rèn luyện
- Giải đáp câu hỏi học thuật: toán, lý, hóa, văn, lịch sử, địa lý, sinh học...
- Hỗ trợ lập trình: JavaScript, Python, Java, C++, React, Node.js...
- Tư vấn kỹ năng sống, học tập, phát triển bản thân
- Viết văn bản, email, báo cáo, tóm tắt tài liệu
- Dịch thuật đa ngôn ngữ
- Giải thích khoa học, công nghệ, AI, blockchain
- Và mọi chủ đề khác

## KIẾN THỨC VỀ ULSA GREEN CREDIT
**Về UGC Token:**
- UGC (ULSA Green Credit) là token ERC-20 trên Ethereum blockchain
- 1 UGC = 1 tín chỉ xanh, không thể làm giả, minh bạch 100%
- Sinh viên nhận UGC khi tham gia hoạt động xanh được phê duyệt

**Cách tích lũy UGC:**
- Tham gia hoạt động xanh (trồng cây, dọn rác, workshop môi trường...)
- Vào mục "Ghi nhận" → chọn hoạt động → upload bằng chứng → chờ duyệt
- Admin/Verifier xét duyệt trong 1-3 ngày làm việc
- Sau khi được duyệt, UGC tự động chuyển vào ví blockchain của bạn

**Sử dụng UGC:**
- Đổi ưu đãi từ đối tác trường (giảm giá căng tin, học liệu, phần mềm...)
- Vào mục "Ưu đãi" để xem danh sách và đổi thưởng

**Điểm rèn luyện:**
- Tính theo số lượng và chất lượng hoạt động tham gia trong học kỳ
- Xem chi tiết tại mục "Điểm rèn luyện"
- Điểm rèn luyện ảnh hưởng đến xếp loại học lực và học bổng

**Blockchain & Bảo mật:**
- Chạy trên mạng Ethereum (Hardhat local network trong demo)
- Smart contract ULSAGreenCredit quản lý việc phát hành và chuyển nhượng UGC
- Mọi giao dịch đều được ghi vào blockchain, không thể xóa hay chỉnh sửa
- Sinh viên có thể xem lịch sử tại mục "Nguồn gốc tín chỉ"

## PHONG CÁCH TRẢ LỜI
- **Ngôn ngữ:** Mặc định tiếng Việt, tự động chuyển sang ngôn ngữ của người dùng nếu họ hỏi bằng ngôn ngữ khác
- **Phong cách:** Thân thiện, tự nhiên như người bạn thông minh, không cứng nhắc
- **Độ dài:** Linh hoạt - câu đơn giản trả lời ngắn gọn, câu phức tạp giải thích chi tiết
- **Emoji:** Dùng emoji phù hợp để tạo sự sinh động, không lạm dụng
- **Format:** Dùng markdown khi cần (in đậm, danh sách, code block)
- **Độ chính xác:** Luôn trả lời chính xác, nếu không chắc thì nói rõ và đưa ra hướng dẫn tìm hiểu thêm
- **Sáng tạo:** Có thể viết thơ, truyện ngắn, slogan, ý tưởng sáng tạo nếu được yêu cầu

## LƯU Ý QUAN TRỌNG
- KHÔNG từ chối trả lời các câu hỏi bình thường với lý do "ngoài phạm vi"
- Luôn cố gắng hữu ích nhất có thể
- Với câu hỏi nhạy cảm hoặc có hại, từ chối lịch sự và giải thích lý do
- Khuyến khích sinh viên tham gia hoạt động xanh và sử dụng hệ thống UGC`

const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function callGeminiViaBackend(messages) {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ messages })
  })

  if (!res.ok) throw new Error('BACKEND_ERROR')
  const data = await res.json()
  // If backend returns fallback signal (no API key or API error), throw so we use local fallback
  if (data.fallback || !data.reply) throw new Error('USE_FALLBACK')
  return data.reply
}

// Fallback smart responses when no API key
function getFallbackResponse(message) {
  const msg = message.toLowerCase()
  
  if (msg.includes('ugc') || msg.includes('tín chỉ') || msg.includes('điểm')) {
    return '🌱 **UGC (ULSA Green Credit)** là token tín chỉ xanh trên blockchain! Bạn có thể kiếm UGC bằng cách tham gia các hoạt động xanh của trường như trồng cây, tiết kiệm năng lượng, tham gia workshop môi trường... Mỗi hoạt động sẽ được quy đổi ra một số lượng UGC nhất định.'
  }
  if (msg.includes('claim') || msg.includes('ghi nhận') || msg.includes('nộp')) {
    return '📝 Để ghi nhận hoạt động và nhận UGC, bạn làm theo các bước:\n1. Tham gia hoạt động xanh\n2. Vào mục **Ghi nhận** trên menu\n3. Chọn hoạt động và upload bằng chứng\n4. Chờ admin xác nhận (thường 1-3 ngày)\n5. UGC sẽ được chuyển vào ví của bạn!'
  }
  if (msg.includes('blockchain') || msg.includes('ví') || msg.includes('wallet')) {
    return '⛓️ Hệ thống sử dụng **Ethereum blockchain** để lưu trữ UGC của bạn! Điều này đảm bảo tính minh bạch và không thể giả mạo. Bạn có thể xem số dư UGC và lịch sử giao dịch trong phần Dashboard.'
  }
  if (msg.includes('đổi') || msg.includes('ưu đãi') || msg.includes('quà')) {
    return '🎁 UGC của bạn có thể đổi lấy nhiều ưu đãi hấp dẫn từ các đối tác của trường! Vào mục **Ưu đãi** để xem danh sách quà tặng và số UGC cần thiết để đổi nhé.'
  }
  if (msg.includes('rèn luyện') || msg.includes('training')) {
    return '📊 **Điểm rèn luyện** được tính dựa trên các hoạt động bạn đã tham gia trong học kỳ. Bạn có thể xem chi tiết trong mục **Điểm rèn luyện** trên thanh menu. Càng tham gia nhiều hoạt động xanh, điểm rèn luyện càng cao!'
  }
  if (msg.includes('xin chào') || msg.includes('hello') || msg.includes('hi') || msg.includes('chào')) {
    return '👋 Xin chào! Tôi là trợ lý ảo của **ULSA Green Credit**! Tôi có thể giúp bạn:\n- 🌱 Tìm hiểu về tín chỉ xanh UGC\n- 📝 Hướng dẫn ghi nhận hoạt động\n- 🎁 Thông tin về ưu đãi\n- ⛓️ Giải thích về blockchain\n\nBạn cần hỗ trợ gì không?'
  }
  if (msg.includes('cảm ơn') || msg.includes('thanks') || msg.includes('thank')) {
    return '😊 Không có gì! Nếu bạn còn thắc mắc về hệ thống ULSA Green Credit, cứ hỏi tôi nhé! Chúc bạn tích lũy được thật nhiều tín chỉ xanh! 🌿'
  }
  
  return '🤖 Tôi hiểu bạn đang hỏi về hệ thống ULSA Green Credit. Để được hỗ trợ chính xác hơn, bạn có thể:\n- Hỏi về **tín chỉ UGC** và cách kiếm\n- Hỏi về quy trình **ghi nhận hoạt động**\n- Hỏi về **ưu đãi** có thể đổi\n- Liên hệ phòng **Công tác sinh viên** nếu cần hỗ trợ trực tiếp!'
}

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: '👋 Xin chào! Tôi là **ULSA Bot** - trợ lý thông minh của hệ thống Green Credit!\n\nTôi có thể giúp bạn tìm hiểu về tín chỉ xanh UGC, cách tích lũy điểm và các ưu đãi. Bạn cần hỏi gì không? 🌿',
}

const SUGGESTIONS = [
  '🌱 UGC là gì?',
  '📝 Cách ghi nhận hoạt động?',
  '🎁 Đổi ưu đãi thế nào?',
  '⛓️ Blockchain hoạt động ra sao?'
]

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      ...INITIAL_MESSAGE,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const resetChat = () => {
    setMessages([{
      ...INITIAL_MESSAGE,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }])
    setInput('')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  const sendMessage = async (text) => {
    const userText = (text || input).trim()
    if (!userText || loading) return

    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    const newMessages = [...messages, { role: 'user', content: userText, time }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      let reply
      try {
        reply = await callGeminiViaBackend(newMessages)
      } catch {
        // Backend unavailable or API key issue → dùng fallback offline
        await new Promise(r => setTimeout(r, 400 + Math.random() * 400))
        reply = getFallbackResponse(userText)
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }])
    } catch {
      // Lỗi thực sự (ví dụ: mất mạng hoàn toàn)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '😅 Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau!',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }])
    } finally {
      setLoading(false)
    }
  }

  const formatMessage = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>')
  }

  return (
    <>
      {/* Chat Window */}
      <div
        className="chatbot__window"
        style={{
          position: 'fixed',
          bottom: open ? '150px' : '-600px',
          right: '24px',
          width: '360px',
          height: '520px',
          background: '#fff',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9999,
          transition: 'bottom 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'all' : 'none',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f7c4a 0%, #15a060 60%, #1db876 100%)',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexShrink: 0,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            padding: '5px',
          }}>
            <img src={logoWeb} alt="Bot" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: 14, lineHeight: 1.2 }}>ULSA Bot</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7fff9e', display: 'inline-block', boxShadow: '0 0 6px #7fff9e' }}></span>
              Đang trực tuyến · Trợ lý tín chỉ xanh
            </div>
          </div>
          {/* Reset button */}
          <button
            onClick={resetChat}
            title="Làm mới hội thoại"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: 30, height: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
              flexShrink: 0,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
          </button>
          {/* Close button */}
          <button
            onClick={() => setOpen(false)}
            title="Đóng"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: 30, height: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
              flexShrink: 0,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          background: '#f8faf8',
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              alignItems: 'flex-end',
              gap: '8px',
            }}>
              {msg.role === 'assistant' && (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#fff',
                  border: '1.5px solid #e8f5e9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                  padding: '4px',
                }}>
                  <img src={logoWeb} alt="Bot" style={{ width: '100%', objectFit: 'contain' }} />
                </div>
              )}
              <div style={{ maxWidth: '78%' }}>
                <div style={{
                   background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #15a060, #0f7c4a)'
                    : '#fff',
                  color: msg.role === 'user' ? '#fff' : '#1a1a1a',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '10px 13px',
                  fontSize: 13,
                  lineHeight: 1.55,
                   boxShadow: msg.role === 'user'
                    ? '0 2px 8px rgba(15, 124, 74, 0.35)'
                    : '0 1px 6px rgba(0,0,0,0.07)',
                  border: msg.role === 'assistant' ? '1px solid #e8f5e9' : 'none',
                }}
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                />
                <div style={{
                  fontSize: 10, color: '#9e9e9e', marginTop: 3,
                  textAlign: msg.role === 'user' ? 'right' : 'left',
                  paddingLeft: 4
                }}>{msg.time}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: '#fff', border: '1.5px solid #e8f5e9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, padding: '4px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              }}>
                <img src={logoWeb} alt="Bot" style={{ width: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{
                background: '#fff', border: '1px solid #e8f5e9',
                borderRadius: '16px 16px 16px 4px',
                padding: '12px 16px',
                boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
              }}>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: '#15a060',
                      animation: `bounce 1.2s ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion chips (only show initially) */}
        {messages.length <= 1 && (
          <div style={{
            padding: '8px 14px',
            display: 'flex', flexWrap: 'wrap', gap: 6,
            background: '#f8faf8',
            borderTop: '1px solid #e8f5e9',
          }}>
            {SUGGESTIONS.map((s, i) => (
              <button key={i}
                onClick={() => sendMessage(s)}
                style={{
                  background: '#e8f5e9',
                  border: '1px solid #c8e6c9',
                  borderRadius: 20,
                  padding: '5px 11px',
                  fontSize: 11.5,
                  color: '#0f7c4a',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { e.target.style.background = '#c8e6c9'; e.target.style.transform = 'scale(1.03)' }}
                onMouseLeave={e => { e.target.style.background = '#e8f5e9'; e.target.style.transform = 'scale(1)' }}
              >{s}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{
          padding: '12px 14px',
          borderTop: '1px solid #e8f5e9',
          display: 'flex', gap: 8,
          background: '#fff',
          flexShrink: 0,
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Nhập câu hỏi của bạn..."
            style={{
              flex: 1,
              border: '1.5px solid #e0e0e0',
              borderRadius: 20,
              padding: '9px 14px',
              fontSize: 13,
              outline: 'none',
              transition: 'border-color 0.2s',
              background: '#f9f9f9',
            }}
            onFocus={e => e.target.style.borderColor = '#15a060'}
            onBlur={e => e.target.style.borderColor = '#e0e0e0'}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            style={{
              width: 40, height: 40,
              borderRadius: '50%',
              background: input.trim() && !loading
                ? 'linear-gradient(135deg, #15a060, #0f7c4a)'
                : '#e0e0e0',
              border: 'none',
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              flexShrink: 0,
              transform: input.trim() && !loading ? 'scale(1)' : 'scale(0.95)',
              boxShadow: input.trim() && !loading ? '0 3px 10px rgba(15,124,74,0.35)' : 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#fff' }}>send</span>
          </button>
        </div>
      </div>

      {/* Floating Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '24px',
          width: 56, height: 56,
          borderRadius: '50%',
          background: open
            ? '#6b7280'
            : 'linear-gradient(135deg, #0f7c4a 0%, #15a060 60%, #1db876 100%)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: open
            ? '0 4px 20px rgba(0,0,0,0.2)'
            : '0 4px 24px rgba(15,124,74,0.45), 0 0 0 4px rgba(15,124,74,0.12)',
          zIndex: 10000,
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: open ? 'scale(0.92) rotate(90deg)' : 'scale(1) rotate(0deg)',
          overflow: 'hidden',
          padding: '10px',
        }}
        title={open ? 'Đóng chat' : 'Chat với ULSA Bot'}
      >
        {open ? (
          <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#fff' }}>close</span>
        ) : (
          <img src={logoWeb} alt="Chat" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        )}
        {/* Pulse ring when closed */}
        {!open && (
          <span style={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            border: '2px solid rgba(15,124,74,0.4)',
            animation: 'pulse-ring 2s ease-out infinite',
          }} />
        )}
      </button>
    </>
  )
}
