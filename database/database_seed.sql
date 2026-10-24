-- ==============================================================================
-- PROJETO: GO Parauapebas (Marketplace de Profissionais Autônomos)
-- ARQUIVO: database_seed.sql
-- DESCRIÇÃO: Categorias iniciais de serviços profissionais em Parauapebas/PA.
--            (Sem usuários fictícios ou dados pessoais)
-- ==============================================================================

INSERT INTO public.categories (name, slug, description, icon_name, display_order, active) VALUES
('Manutenção de Ar-Condicionado', 'ar-condicionado', 'Instalação, limpeza química, carga de gás e manutenção preventiva de Splits', 'ac_unit', 1, true),
('Eletricista Residencial e Predial', 'eletricista', 'Instalações de tomadas, fiação, quadros de distribuição, disjuntores e iluminação', 'bolt', 2, true),
('Encanador e Bombeiro Hidráulico', 'encanador', 'Conserto de vazamentos, desentupimentos, instalação de torneiras e caixas d''água', 'plumbing', 3, true),
('Pedreiro e Reformas', 'pedreiro', 'Construção civil, alvenaria, colocação de pisos/porcelanatos, reboco e fundações', 'construction', 4, true),
('Pintor Residencial e Comercial', 'pintor', 'Pinturas internas e externas, textura, massa corrida e aplicação de verniz', 'format_paint', 5, true),
('Diarista e Serviços de Limpeza', 'diarista', 'Faxina residencial, pós-obra, limpeza comercial e higienização pesada', 'cleaning_services', 6, true),
('Mecânica e Auto Socorro', 'mecanico', 'Manutenção mecânica automotiva, revisão preventiva, freios e socorro mecânico', 'build', 7, true),
('Técnico de Informática e Celulares', 'informatica-celular', 'Formatação de computadores, troca de tela de celulares e manutenção de redes', 'computer', 8, true),
('Fretes, Mudanças e Carretos', 'fretes-mudancas', 'Transporte de cargas, carretos locais em Parauapebas e mudanças residenciais', 'local_shipping', 9, true),
('Marcenaria e Montagem de Móveis', 'marcenaria', 'Montagem e desmontagem de móveis, reparos e fabricação de móveis sob medida', 'handyman', 10, true),
('Manicure, Cabelo e Estética', 'beleza-estetica', 'Atendimento a domicílio de manicure, pedicure, corte, escova e design de sobrancelhas', 'spa', 11, true),
('Jardinagem e Roçagem', 'jardinagem', 'Poda de árvores, corte de grama, paisagismo e limpeza de terrenos', 'yard', 12, true),
('Serralheria e Solda', 'serralheria', 'Grades de proteção, portões de ferro/alumínio, corrimãos e soldas especiais', 'hardware', 13, true),
('Gesseiro e Drywall', 'gesso-drywall', 'Rebaixamento de teto, forros de gesso e drywall, molduras e sancas iluminadas', 'layers', 14, true)
ON CONFLICT (slug) DO UPDATE 
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon_name = EXCLUDED.icon_name,
    display_order = EXCLUDED.display_order,
    active = EXCLUDED.active;
