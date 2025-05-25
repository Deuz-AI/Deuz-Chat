# Sohbet Silme Akış Diyagramı

## Mevcut Sorunlu Akış

```mermaid
sequenceDiagram
    participant Kullanici
    participant Sidebar
    participant Store
    participant Chat
    
    Kullanici->>Sidebar: Aktif sohbeti sil
    Sidebar->>Store: deleteSession(aktifSessionId)
    Store-->>Sidebar: Silme tamamlandı
    Sidebar->>Store: createSession() (Sohbet A)
    Store-->>Sidebar: Sohbet A oluşturuldu
    Sidebar->>Chat: /sessionA'ya yönlendir
    
    Store->>Store: currentSessionId = null
    
    Chat->>Chat: useEffect tetiklenir (sessionId null)
    Chat->>Store: createSession() (Sohbet B)
    Store-->>Chat: Sohbet B oluşturuldu
    Chat->>Chat: /sessionB'ye yönlendir
    
    Kullanici-->>Chat: Sohbet B'yi görür (2 sohbet oluştu)
```

## Düzeltilmiş Akış

```mermaid
sequenceDiagram
    participant Kullanici
    participant Sidebar
    participant Store
    participant Chat
    
    Kullanici->>Sidebar: Aktif sohbeti sil
    Sidebar->>Store: deleteSession(aktifSessionId)
    Store-->>Sidebar: Silme tamamlandı
    Sidebar->>Chat: Ana sayfaya yönlendir (/)
    
    Store->>Store: currentSessionId = null
    
    Chat->>Chat: useEffect tetiklenir (sessionId null)
    Chat->>Store: createSession() (Yeni Sohbet)
    Store-->>Chat: Yeni Sohbet oluşturuldu
    Chat->>Chat: /yeniSessionId'ye yönlendir
    
    Kullanici-->>Chat: Yeni Sohbet'i görür (1 sohbet oluştu)
```

## Açıklama

1. **Mevcut Sorun**: Sidebar ve Chat bileşeni aynı anda yeni sohbet oluşturuyordu.
2. **Çözüm**: Sadece Chat bileşeninin yeni sohbet oluşturmasına izin veriyoruz.
3. **Değişiklik**: Sidebar'da `handleDeleteSession` fonksiyonundaki yeni sohbet oluşturma kısmını kaldırdık ve sadece ana sayfaya yönlendirme yapıyoruz.
    id["This ❤ Unicode"]